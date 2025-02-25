const appLoginScreen = document.getElementById('appLoginScreen');
const reportSelectionScreen = document.getElementById('reportSelectionScreen');
const loginScreen = document.getElementById('loginScreen');
const mainContent = document.getElementById('mainContent');
const appLoginForm = document.getElementById('appLoginForm');
const appLoginError = document.getElementById('appLoginError');
const simpleReportBtn = document.getElementById('simpleReportBtn');
const loginBtn = document.getElementById('loginBtn');
const form = document.getElementById('form');
const reportContainer = document.getElementById('reportContainer');
const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');

// Mapa para armazenar os nomes das contas
const adAccountsMap = {};

// Função para alternar telas
function showScreen(screen) {
    appLoginScreen.style.display = 'none';
    reportSelectionScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    mainContent.style.display = 'none';
    screen.style.display = 'block';
}

// Login do app
appLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === '@admin' && password === '134679') {
        showScreen(reportSelectionScreen);
    } else {
        appLoginError.textContent = 'Usuário ou senha inválidos.';
        appLoginError.style.display = 'block';
    }
});

// Seleção de relatório simplificado
simpleReportBtn.addEventListener('click', () => {
    showScreen(loginScreen);
});

// Login com Facebook e carregamento das contas
loginBtn.addEventListener('click', () => {
    FB.login(function(response) {
        if (response.authResponse) {
            showScreen(mainContent);
            FB.api('/me/adaccounts', { fields: 'id,name' }, function(response) {
                if (response && !response.error) {
                    const unitSelect = document.getElementById('unitId');
                    unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
                    response.data.forEach(account => {
                        adAccountsMap[account.id] = account.name; // Armazena no mapa
                        const option = document.createElement('option');
                        option.value = account.id;
                        option.textContent = account.name; // Nome correto no select
                        unitSelect.appendChild(option);
                    });
                } else {
                    console.error('Erro ao carregar contas:', response.error);
                    document.getElementById('loginError').textContent = 'Erro ao carregar contas de anúncios.';
                    document.getElementById('loginError').style.display = 'block';
                }
            });
        } else {
            document.getElementById('loginError').textContent = 'Login cancelado ou falhou.';
            document.getElementById('loginError').style.display = 'block';
        }
    }, {scope: 'ads_read'});
});

// Geração do relatório com filtragem opcional corrigida
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const unitId = document.getElementById('unitId').value;
    const unitName = adAccountsMap[unitId] || 'Unidade Desconhecida'; // Usa o mapa para pegar o nome
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const adSetNameFilter = document.getElementById('adSetName').value.trim().toLowerCase(); // Nome para filtrar (opcional), convertido para minúsculas

    if (!unitId || !startDate || !endDate) {
        reportContainer.innerHTML = '<p>Preencha todos os campos obrigatórios (Unidade e Período).</p>';
        return;
    }

    let apiCall = {
        fields: ['spend', 'actions', 'reach', 'name'], // Atualizado para 'name' (sem 'adset.')
        time_range: { since: startDate, until: endDate },
        level: 'adset'
    };

    // Se o filtro de nome do conjunto de anúncios não estiver vazio, aplica a filtragem
    if (adSetNameFilter) {
        apiCall.filtering = [{
            field: 'name', // Atualizado para 'name' (sem 'adset.')
            operator: 'CONTAIN', // Mantém 'CONTAIN' como corrigido anteriormente
            value: adSetNameFilter
        }];
    } else {
        // Sem filtragem, ajusta para nivel de conta para somar todos os adsets
        apiCall.level = 'account';
        delete apiCall.filtering; // Garante que não há filtro
        // Ajusta os fields para o nível da conta, removendo o campo hierárquico
        apiCall.fields = ['spend', 'actions', 'reach'];
    }

    console.log('API Call:', JSON.stringify(apiCall, null, 2)); // Log detalhado para depuração (remova em produção)

    FB.api(
        `/${unitId}/insights`,
        apiCall,
        function(response) {
            console.log('API Response:', JSON.stringify(response, null, 2)); // Log detalhado para depuração (remova em produção)

            if (response && !response.error && response.data.length > 0) {
                let totalSpend = 0;
                let totalConversations = 0;
                let totalReach = 0;
                let reportHTML = '';

                response.data.forEach(data => {
                    let spend = 0;
                    let conversations = 0;
                    let reach = 0;
                    let adSetName = 'Conjunto Desconhecido';

                    if (apiCall.level === 'adset') {
                        // Quando filtrando por adset, usa os dados diretos
                        spend = parseFloat(data.spend || 0);
                        const actions = data.actions || [];
                        reach = parseInt(data.reach || 0);
                        adSetName = data.name || 'Conjunto Desconhecido'; // Atualizado para 'name' (sem 'adset.')

                        actions.forEach(action => {
                            if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                                conversations = parseInt(action.value) || 0; // Garante que é um número inteiro
                            }
                        });
                    } else {
                        // Quando no nível da conta (sem filtro), soma todos os adsets
                        spend = parseFloat(data.spend || 0);
                        const actions = data.actions || [];
                        reach = parseInt(data.reach || 0);

                        actions.forEach(action => {
                            if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                                conversations = parseInt(action.value) || 0; // Garante que é um número inteiro
                            }
                        });
                    }

                    totalSpend += spend;
                    totalConversations += conversations;
                    totalReach += reach;

                    if (apiCall.level === 'adset') {
                        // Mostra detalhes apenas quando filtrando por adset
                        reportHTML += `
                            <p><strong>Conjunto de Anúncios:</strong> ${adSetName}</p>
                            <p>💰 Investimento: R$ ${spend.toFixed(2).replace('.', ',')}</p>
                            <p>💬 Mensagens iniciadas: ${conversations}</p>
                            <p>📢 Alcance: ${reach.toLocaleString('pt-BR')} pessoas</p>
                            <hr>
                        `;
                    }
                });

                const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';

                // Mantém o relatório contínuo com <p> para cada linha
                reportContainer.innerHTML = `
                    <p>📊 RELATÓRIO - CA - ${unitName}</p>
                    <p>📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
                    <p>💰 Investimento Total: R$ ${totalSpend.toFixed(2).replace('.', ',')}</p>
                    <p>💬 Mensagens iniciadas: ${totalConversations}</p>
                    <p>💵 Custo por mensagem: R$ ${costPerConversation.replace('.', ',')}</p>
                    <p>📢 Alcance Total: ${totalReach.toLocaleString('pt-BR')} pessoas</p>
                    ${reportHTML}
                `;
                shareWhatsAppBtn.style.display = 'block';
            } else {
                reportContainer.innerHTML = '<p>Nenhum dado encontrado para os filtros aplicados ou erro na requisição.</p>';
                if (response.error) {
                    console.error('Erro da API:', response.error);
                }
            }
        }
    );
});

// Compartilhar no WhatsApp
shareWhatsAppBtn.addEventListener('click', () => {
    const reportText = reportContainer.innerText;
    const encodedText = encodeURIComponent(reportText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
});

// Mostrar tela inicial
showScreen(appLoginScreen);