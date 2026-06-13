const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/components/AiAssistant.tsx',
  'src/components/Financials.tsx',
  'src/components/DocumentGenerator.tsx',
  'src/components/Confirmations.tsx',
  'src/services/geminiService.ts'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/sessão/g, 'atendimento');
    content = content.replace(/Sessão/g, 'Atendimento');
    content = content.replace(/sessões/g, 'atendimentos');
    content = content.replace(/Sessões/g, 'Atendimentos');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
