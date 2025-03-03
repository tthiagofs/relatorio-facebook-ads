// RelatorioCompleto.js - Módulo para o Relatório Completo

document.addEventListener('DOMContentLoaded', () => {
    console.log('RelatorioCompleto.js carregado com sucesso - Versão Atualizada (03/03/2025)'); // Log para confirmar que a versão está atualizada

    // Elementos DOM
    const reportSelectionScreen = document.getElementById('reportSelectionScreen');
    const loginScreen = document.getElementById('loginScreen');
    const fullReportScreen = document.getElementById('fullReportScreen');
    const fullReportBtn = document.getElementById('fullReportBtn');
    const backToSelectionBtn = document.getElementById('backToSelectionBtn');
    const loginBtn = document.getElementById('loginBtn');

    // Verificação para garantir que os elementos foram encontrados
    if (!reportSelectionScreen || !loginScreen || !fullReportScreen || !fullReportBtn || !backToSelectionBtn || !loginBtn) {
        console.error('Um ou mais elementos não foram encontrados no DOM:', {
            reportSelectionScreen: !!reportSelectionScreen,
            loginScreen: !!loginScreen,
            fullReportScreen: !!fullReportScreen,
            fullReportBtn: !!fullReportBtn,
            backToSelectionBtn: !!backToSelectionBtn,
            loginBtn: !!loginBtn
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

    // Evento para o botão "Login com Facebook"
    loginBtn.addEventListener('click', (event) => {
        event.preventDefault(); // Impede qualquer comportamento padrão do botão
        console.log('Botão Login com Facebook clicado - Versão Atualizada (03/03/2025)'); // Log para confirmar evento

        if (typeof FB === 'undefined') {
            console.error('Facebook SDK não está carregado ou inicializado corretamente.');
            document.getElementById('loginError').textContent = 'Erro: Facebook SDK não está disponível. Verifique sua conexão ou tente novamente.';
            document.getElementById('loginError').style.display = 'block';
            return;
        }

        // Adiciona permissões extras para garantir acesso às contas de anúncios
        FB.login(function(response) {
            if (response.authResponse) {
                console.log('Login com Facebook bem-sucedido - Versão Atualizada (03/03/2025):', response.authResponse);
                showScreen(fullReportScreen);

                // Obtém o token de acesso para verificar permissões
                const accessToken = response.authResponse.accessToken;
                console.log('Access Token:', accessToken);

                // Chama a API para obter as contas de anúncios
                FB.api('/me/adaccounts', { fields: 'id,name', access_token: accessToken }, function(accountResponse) {
                    if (accountResponse && !accountResponse.error) {
                        console.log('Resposta da API /me/adaccounts - Versão Atualizada (03/03/2025):', accountResponse);
                        const accounts = accountResponse.data || [];
                        accounts.forEach(account => {
                            adAccountsMap[account.id] = account.name;
                            // Verifica as contas específicas
                            if (account.id === '1187332129240271') {
                                console.log('Conta 1187332129240271 - CA 01 - Oral Centter Sete Lagoas encontrada:', account);
                            }
                            if (account.id === '9586847491331372') {
                                console.log('Conta 9586847491331372 - CA - Oral Centter Jaíba encontrada:', account);
                            }
                        });
                        // Verifica se as contas específicas foram encontradas
                        if (!accounts.some(account => account.id === '1187332129240271')) {
                            console.warn('Conta 1187332129240271 - CA 01 - Oral Centter Sete Lagoas NÃO encontrada na lista de contas retornada pela API.');
                        }
                        if (!accounts.some(account => account.id === '9586847491331372')) {
                            console.warn('Conta 9586847491331372 - CA - Oral Centter Jaíba NÃO encontrada na lista de contas retornada pela API.');
                        }
                        if (!accounts.some(account => account.id === '1187332129240271') || !accounts.some(account => account.id === '9586847491331372')) {
                            document.getElementById('loginError').textContent = 'Uma ou mais contas esperadas (Sete Lagoas ou Jaíba) não foram encontradas. Verifique suas permissões ou o status das contas.';
                            document.getElementById('loginError').style.display = 'block';
                        }
                    } else {
                        console.error('Erro ao carregar contas:', accountResponse.error);
                        document.getElementById('loginError').textContent = 'Erro ao carregar contas de anúncios: ' + (accountResponse.error.message || 'Erro desconhecido');
                        document.getElementById('loginError').style.display = 'block';
                    }
                });
            } else {
                console.error('Falha no login com Facebook:', response);
                document.getElementById('loginError').textContent = 'Login cancelado ou falhou. Por favor, tente novamente.';
                document.getElementById('loginError').style.display = 'block';
            }
        }, {scope: 'ads_read,ads_management'}); // Adiciona permissões extras
    });

    console.log('RelatorioCompleto.js carregado com sucesso');
});