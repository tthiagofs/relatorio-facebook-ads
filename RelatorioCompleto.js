// RelatorioCompleto.js - Módulo para o Relatório Completo

document.addEventListener('DOMContentLoaded', () => {
    console.log('RelatorioCompleto.js carregado com sucesso - Versão Atualizada (03/03/2025)'); // Log para confirmar que a versão está atualizada

    // Elementos DOM
    const reportSelectionScreen = document.getElementById('reportSelectionScreen');
    const loginScreen = document.getElementById('loginScreen');
    const fullReportScreen = document.getElementById('fullReportScreen');
    const fullReportBtn = document.getElementById('fullReportBtn');
    const backToSelectionBtn = document.getElementById('backToSelectionBtn');

    // Verificação para garantir que os elementos foram encontrados
    if (!reportSelectionScreen || !loginScreen || !fullReportScreen || !fullReportBtn || !backToSelectionBtn) {
        console.error('Um ou mais elementos não foram encontrados no DOM:', {
            reportSelectionScreen: !!reportSelectionScreen,
            loginScreen: !!loginScreen,
            fullReportScreen: !!fullReportScreen,
            fullReportBtn: !!fullReportBtn,
            backToSelectionBtn: !!backToSelectionBtn
        });
        return;
    }

    // Mapa para armazenar as contas de anúncios
    const adAccountsMap = {};

    // Função para alternar telas
    function showScreen(screen) {
        console.log('Alternando para a tela:', screen.id); // Log para depuração
        reportSelectionScreen.style.display = 'none';
        loginScreen.style.display = 'none';
        fullReportScreen.style.display = 'none';
        screen.style.display = 'block';
    }

    // Evento para o botão "Relatório Completo"
    fullReportBtn.addEventListener('click', () => {
        console.log('Botão Relatório Completo clicado - Versão Atualizada (03/03/2025)');
        showScreen(loginScreen);
        console.log('Iniciando o módulo de Relatório Completo...');
    });

    // Evento para o botão "Voltar ao Início"
    backToSelectionBtn.addEventListener('click', () => {
        console.log('Botão Voltar ao Início clicado - Versão Atualizada (03/03/2025)');
        showScreen(reportSelectionScreen);
    });

    console.log('RelatorioCompleto.js carregado com sucesso');
});