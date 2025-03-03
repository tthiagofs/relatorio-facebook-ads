// RelatorioCompleto.js - Módulo para o Relatório Completo

document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const reportSelectionScreen = document.getElementById('reportSelectionScreen');
    const fullReportScreen = document.getElementById('fullReportScreen');
    const fullReportBtn = document.getElementById('fullReportBtn');
    const backToSelectionBtn = document.getElementById('backToSelectionBtn');

    // Verificação para garantir que os elementos foram encontrados
    if (!reportSelectionScreen || !fullReportScreen || !fullReportBtn || !backToSelectionBtn) {
        console.error('Um ou mais elementos não foram encontrados no DOM:', {
            reportSelectionScreen: !!reportSelectionScreen,
            fullReportScreen: !!fullReportScreen,
            fullReportBtn: !!fullReportBtn,
            backToSelectionBtn: !!backToSelectionBtn
        });
        return;
    }

    // Função para alternar telas
    function showScreen(screen) {
        console.log('Alternando para a tela:', screen.id); // Log para depuração
        reportSelectionScreen.style.display = 'none';
        fullReportScreen.style.display = 'none';
        screen.style.display = 'block';
    }

    // Evento para o botão "Relatório Completo"
    fullReportBtn.addEventListener('click', () => {
        console.log('Botão Relatório Completo clicado'); // Log para depuração
        showScreen(fullReportScreen);
        console.log('Iniciando o módulo de Relatório Completo...');
        // Aqui você pode adicionar a lógica para o "Relatório Completo"
        // Exemplo: você pode adicionar chamadas à API do Facebook, renderizar gráficos, etc.
    });

    // Evento para o botão "Voltar ao Início"
    backToSelectionBtn.addEventListener('click', () => {
        console.log('Botão Voltar ao Início clicado'); // Log para depuração
        showScreen(reportSelectionScreen);
    });

    console.log('RelatorioCompleto.js carregado com sucesso'); // Log para confirmar que o script foi executado
});