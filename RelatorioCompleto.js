// RelatorioCompleto.js - Módulo para o Relatório Completo

// Elementos DOM
const reportSelectionScreen = document.getElementById('reportSelectionScreen');
const fullReportScreen = document.getElementById('fullReportScreen');
const fullReportBtn = document.getElementById('fullReportBtn');
const backToSelectionBtn = document.getElementById('backToSelectionBtn');

// Função para alternar telas
function showScreen(screen) {
    reportSelectionScreen.style.display = 'none';
    fullReportScreen.style.display = 'none';
    screen.style.display = 'block';
}

// Evento para o botão "Relatório Completo"
fullReportBtn.addEventListener('click', () => {
    showScreen(fullReportScreen);
    console.log('Iniciando o módulo de Relatório Completo...');
    // Aqui você pode adicionar a lógica para o "Relatório Completo"
    // Exemplo: você pode adicionar chamadas à API do Facebook, renderizar gráficos, etc.
});

// Evento para o botão "Voltar ao Início"
backToSelectionBtn.addEventListener('click', () => {
    showScreen(reportSelectionScreen);
});