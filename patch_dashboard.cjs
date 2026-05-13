const fs = require('fs');

const filePath = 'src/pages/Dashboard.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
const importTarget = "import YearlyChartBoard from '../components/dashboard/YearlyChartBoard';";
content = content.replace(importTarget, importTarget + "\r\nimport StatusBoard from '../components/dashboard/StatusBoard';");

// 2. Fix component signature
content = content.replace('const Dashboard = () => {', 'const Dashboard = ({ currentUser }) => {');

// 3. Change overflow-hidden to overflow-y-auto
content = content.replace(
  '"flex flex-col h-full w-full overflow-hidden bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 p-[clamp(1rem,2vw,2.5rem)] gap-[clamp(0.5rem,1.5vh,1.5rem)]"',
  '"flex flex-col h-full w-full overflow-y-auto bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 p-[clamp(1rem,2vw,2.5rem)] gap-[clamp(0.5rem,1.5vh,1.5rem)]"'
);

// 4. Insert StatusBoard section before the Overtime Modal
const modalMarker = '\r\n\r\n            {/* ═══ Overtime Modal ═══ */}';
const statusBoardSection = '\r\n\r\n            {/* ═══ 현황판 (Status Board) ═══ */}\r\n            <section className="rounded-3xl bg-white shadow-sm ring-1 ring-gray-200 overflow-hidden flex-none" style={{ height: \'480px\' }}>\r\n                <StatusBoard currentUser={currentUser} />\r\n            </section>\r\n\r\n            {/* ═══ Overtime Modal ═══ */}';
content = content.replace(modalMarker, statusBoardSection);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
