import fs from 'fs';

/**
 * Parse week_start to extract year, month, week_number
 */
function parseDateMeta(weekStart) {
    if (!weekStart) return { year: 2026, month: 1, weekNumber: 1 };
    const parts = weekStart.split('-');
    const year = parseInt(parts[0]) || 2026;
    const month = parseInt(parts[1]) || 1;
    const day = parseInt(parts[2]) || 1;

    const d = new Date(year, month - 1, day);
    const dayOfYear = Math.floor((d - new Date(year, 0, 1)) / 86400000) + 1;
    const weekNumber = Math.ceil(dayOfYear / 7);

    return { year, month, weekNumber };
}

/**
 * Generate row-level document from a single record
 */
function createRowDocument(record, id) {
    const { year, month, weekNumber } = parseDateMeta(record.week_start);

    const text = `Employee: ${record.employee}
Department: ${record.department}
Project: ${record.project_name} (code: ${record.project_code})
Week Start: ${record.week_start}

Mon: ${record.mon} hours
Tue: ${record.tue} hours
Wed: ${record.wed} hours
Thu: ${record.thu} hours
Fri: ${record.fri} hours
Sat: ${record.sat} hours
Sun: ${record.sun} hours

Total weekly hours: ${record.total}`;

    return {
        id,
        text,
        payload: {
            text,
            employee: record.employee,
            department: record.department,
            project_name: record.project_name,
            week_start: record.week_start,
            year,
            month,
            week_number: weekNumber,
            total: parseFloat(record.total) || 0,
            document_type: 'row',
            source: 'database_json'
        }
    };
}

/**
 * Generate employee weekly aggregated documents
 */
function createEmployeeWeeklyDocs(records, startId) {
    const groups = {};

    records.forEach(r => {
        const key = `${r.employee}||${r.week_start}`;
        if (!groups[key]) {
            groups[key] = {
                employee: r.employee,
                department: r.department,
                week_start: r.week_start,
                projects: [],
                dailyTotal: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                totalHours: 0
            };
        }
        const g = groups[key];
        g.projects.push({ name: r.project_name, hours: parseFloat(r.total) || 0 });
        g.totalHours += parseFloat(r.total) || 0;
        ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].forEach(day => {
            g.dailyTotal[day] += parseFloat(r[day] || 0) || 0;
        });
    });

    let id = startId;
    return Object.values(groups).map(g => {
        const { year, month, weekNumber } = parseDateMeta(g.week_start);
        const overtime = g.totalHours > 40 ? Math.round((g.totalHours - 40) * 10) / 10 : 0;
        const projectDist = g.projects.map(p => `  ${p.name}: ${p.hours} hours`).join('\n');
        const dailyStr = `Mon: ${g.dailyTotal.mon}h | Tue: ${g.dailyTotal.tue}h | Wed: ${g.dailyTotal.wed}h | Thu: ${g.dailyTotal.thu}h | Fri: ${g.dailyTotal.fri}h | Sat: ${g.dailyTotal.sat}h | Sun: ${g.dailyTotal.sun}h`;

        const text = `Employee: ${g.employee}
Department: ${g.department}
Week: ${g.week_start}

Project time distribution:
${projectDist}

Daily breakdown: ${dailyStr}
Total weekly work hours: ${Math.round(g.totalHours * 10) / 10}
Standard work hours: 40
Overtime: ${overtime > 0 ? `${overtime} hours (exceeds 40h standard)` : 'None'}`;

        return {
            id: id++,
            text,
            payload: {
                text,
                employee: g.employee,
                department: g.department,
                project_name: g.projects.map(p => p.name).join(', '),
                week_start: g.week_start,
                year,
                month,
                week_number: weekNumber,
                total: Math.round(g.totalHours * 10) / 10,
                overtime,
                has_overtime: overtime > 0,
                document_type: 'employee_week',
                source: 'database_json'
            }
        };
    });
}

/**
 * Generate department weekly aggregated documents
 */
function createDepartmentWeeklyDocs(records, startId) {
    const groups = {};

    records.forEach(r => {
        const key = `${r.department}||${r.week_start}`;
        if (!groups[key]) {
            groups[key] = {
                department: r.department,
                week_start: r.week_start,
                employees: new Set(),
                projects: {},
                totalHours: 0
            };
        }
        const g = groups[key];
        g.employees.add(r.employee);
        const hours = parseFloat(r.total) || 0;
        g.projects[r.project_name] = (g.projects[r.project_name] || 0) + hours;
        g.totalHours += hours;
    });

    let id = startId;
    return Object.values(groups).map(g => {
        const { year, month, weekNumber } = parseDateMeta(g.week_start);
        const projectDist = Object.entries(g.projects)
            .sort((a, b) => b[1] - a[1])
            .map(([name, hours]) => `  ${name}: ${hours} hours`)
            .join('\n');
        const empList = [...g.employees].join(', ');
        const avgPerEmployee = g.employees.size > 0
            ? Math.round(g.totalHours / g.employees.size * 10) / 10 : 0;

        const text = `Department: ${g.department}
Week: ${g.week_start}
Team members (${g.employees.size}): ${empList}

Project time distribution:
${projectDist}

Total department hours: ${Math.round(g.totalHours * 10) / 10}
Average per employee: ${avgPerEmployee} hours`;

        return {
            id: id++,
            text,
            payload: {
                text,
                employee: empList,
                department: g.department,
                project_name: Object.keys(g.projects).join(', '),
                week_start: g.week_start,
                year,
                month,
                week_number: weekNumber,
                total: Math.round(g.totalHours * 10) / 10,
                document_type: 'department_week',
                source: 'database_json'
            }
        };
    });
}

/**
 * Process JSON file and generate all document types
 */
export function processData(jsonFilePath) {
    console.log(`[Data Processor] Reading ${jsonFilePath}...`);

    if (!fs.existsSync(jsonFilePath)) return [];
    const content = fs.readFileSync(jsonFilePath, 'utf8');
    const records = JSON.parse(content);

    console.log(`[Data Processor] Parsed ${records.length} records.`);

    // 1. Row-level documents
    const rowDocs = records.map((r, i) => createRowDocument(r, i + 1));
    
    // 2. Employee weekly aggregated
    const empWeekDocs = createEmployeeWeeklyDocs(records, rowDocs.length + 1);
    
    // 3. Department weekly aggregated
    const deptWeekDocs = createDepartmentWeeklyDocs(records, rowDocs.length + empWeekDocs.length + 1);

    const allDocs = [...rowDocs, ...empWeekDocs, ...deptWeekDocs];
    console.log(`[Data Processor] Total documents: ${allDocs.length}`);

    return allDocs;
}
