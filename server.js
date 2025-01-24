const express = require('express');
const app = express();
const path = require('path');

// Servindo os arquivos estáticos
app.use(express.static(path.join(__dirname, '')));

// Rota para o arquivo HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const port = 3000;
app.listen(port, () => {
    console.log(`App rodando em http://localhost:${port}`);
});