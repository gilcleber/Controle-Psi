const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('e:\\ANTIGRAVITY LINKS\\CONTROLE-PSI\\src', function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace exact case combinations
        let newContent = content
            .replace(/Pacientes/g, 'Clientes')
            .replace(/pacientes/g, 'clientes')
            .replace(/Paciente/g, 'Cliente')
            .replace(/paciente/g, 'cliente');
            
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Updated:', filePath);
        }
    }
});
