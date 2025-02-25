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

// Mapa para armazenar os nomes das contas e IDs dos ad sets
const adAccountsMap = {};
const adSetsMap = {}; // Novo mapa para armazenar IDs e nomes dos ad sets

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
            // Carrega as contas de anúncios
            FB.api('/me/adaccounts', { fields: 'id,name' }, function(accountResponse) {
                if (accountResponse && !accountResponse.error) {
                    const unitSelect = document.getElementById('unitId');
                    unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
                    accountResponse.data.forEach(account => {
                        adAccountsMap[account.id] = account.name; // Armazena no mapa
                        const option = document.createElement('option');
                        option.value = account.id;
                        option.textContent = account.name; // Nome correto no select
                        unitSelect.appendChild(option);
                    });
                } else {
                    console.error('Erro ao carregar contas:', accountResponse.error);
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

// Carrega os ad sets quando uma unidade é selecionada
document.getElementById('unitId').addEventListener('change', function() {
    const unitId = this.value;
    if (unitId) {
        FB.api(`/${unitId}/adsets`, { fields: 'id,name' }, function(adSetResponse) {
            if (adSetResponse && !adSetResponse.error) {
                adSetsMap[unitId] = {}; // Limpa ou inicializa o mapa para esta unidade
                adSetResponse.data.forEach(adSet => {
                    adSetsMap[unitId][adSet.id] = adSet.name.toLowerCase(); // Armazena IDs e nomes em minúsculas para filtragem
                });
                console.log('Ad Sets carregados:', adSetsMap[unitId]); // Log para depuração (remova em produção)
            } else {
                console.error('Erro ao carregar ad sets:', adSetResponse.error);
            }
        });
    }
});

// Função para obter insights de um único ad set
async function getAdSetInsights(adSetId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        FB.api(
            `/${adSetId}/insights`,
            {
                fields: ['spend', 'actions', 'reach'], // Apenas métricas válidas, removido 'name'
                time_range: { since: startDate, until: endDate }
            },
            function(response) {
                console.log(`Insights para ad set ${adSetId}:`, JSON.stringify(response, null, 2)); // Log detalhado para depuração (remova em produção)
                if (response && !response.error) {
                    resolve(response.data[0] || {});
                } else {
                    console.error(`Erro ao carregar insights para ad set ${adSetId}:`, response.error);
                    resolve({});
                }
            }
        );
    });
}

// Geração do relatório com soma consolidada dos ad sets filtrados
form.addEventListener('submit', async (e) => {
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

    let totalSpend = 0;
    let totalConversations = 0;
    let totalReach = 0;

    if (adSetNameFilter) {
        // Filtra localmente os IDs dos ad sets cujo nome contém o texto digitado
        if (!adSetsMap[unitId] || Object.keys(adSetsMap[unitId]).length === 0) {
            reportContainer.innerHTML = '<p>Carregue os conjuntos de anúncios selecionando a unidade novamente.</p>';
            shareWhatsAppBtn.style.display = 'none';
            return;
        }

        const adSetIds = Object.entries(adSetsMap[unitId])
            .filter(([id, name]) => name.includes(adSetNameFilter))
            .map(([id]) => id);

        if (adSetIds.length === 0) {
            reportContainer.innerHTML = '<p>Nenhum conjunto de anúncios encontrado para o filtro especificado.</p>';
            shareWhatsAppBtn.style.display = 'none';
            return;
        }

        // Faz chamadas individuais para os insights de cada ad set filtrado
        for (const adSetId of adSetIds) {
            const insights = await getAdSetInsights(adSetId, startDate, endDate);
            console.log(`Insights processados para ad set ${adSetId}:`, insights); // Log para depuração (remova em produção)
            if (insights && Object.keys(insights).length > 0) {
                const spend = parseFloat(insights.spend || 0) || 0; // Garantir valor padrão 0 se ausente
                const actions = insights.actions || [];
                const reach = parseInt(insights.reach || 0) || 0; // Garantir valor padrão 0 se ausente

                let conversations = 0;
                actions.forEach(action => {
                    if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                        conversations = parseInt(action.value) || 0; // Garante que é um número inteiro
                    }
                });

                // Verificar se há pelo menos um dado válido antes de adicionar ao total
                if (spend > 0 || conversations > 0 || reach > 0) {
                    totalSpend += spend;
                    totalConversations += conversations;
                    totalReach += reach;
                } else {
                    console.warn(`Nenhum dado válido retornado para ad set ${adSetId}`);
                }
            } else {
                console.warn(`Nenhum dado válido retornado para ad set ${adSetId}`);
            }
        }
    } else {
        // Sem filtragem, usa o nível da conta para somar todos os adsets
        FB.api(
            `/${unitId}/insights`,
            {
                fields: ['spend', 'actions', 'reach'],
                time_range: { since: startDate, until: endDate },
                level: 'account'
            },
            function(response) {
                console.log('Resposta insights da conta:', JSON.stringify(response, null, 2)); // Log para depuração (remova em produção)
                if (response && !response.error && response.data.length > 0) {
                    response.data.forEach(data => {
                        const spend = parseFloat(data.spend || 0) || 0; // Garantir valor padrão 0 se ausente
                        const actions = data.actions || [];
                        const reach = parseInt(data.reach || 0) || 0; // Garantir valor padrão 0 se ausente

                        let conversations = 0;
                        actions.forEach(action => {
                            if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                                conversations = parseInt(action.value) || 0; // Garante que é um número inteiro
                            }
                        });

                        totalSpend += spend;
                        totalConversations += conversations;
                        totalReach += reach;
                    });

                    const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';

                    // Gera relatório consolidado sem detalhes individuais
                    reportContainer.innerHTML = `
                        <p>📊 RELATÓRIO - CA - ${unitName}</p>
                        <p>📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
                        <p>💰 Investimento Total: R$ ${totalSpend.toFixed(2).replace('.', ',')}</p>
                        <p>💬 Mensagens iniciadas: ${totalConversations}</p>
                        <p>💵 Custo por mensagem: R$ ${costPerConversation.replace('.', ',')}</p>
                        <p>📢 Alcance Total: ${totalReach.toLocaleString('pt-BR')} pessoas</p>
                    `;
                    shareWhatsAppBtn.style.display = 'block';
                } else {
                    reportContainer.innerHTML = '<p>Nenhum dado encontrado para os filtros aplicados ou erro na requisição.</p>';
                    if (response.error) {
                        console.error('Erro da API:', response.error);
                    }
                    shareWhatsAppBtn.style.display = 'none';
                }
            }
        );
        return; // Sai da função para evitar duplicação
    }

    // Após processar todos os ad sets filtrados
    const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';

    // Gera relatório consolidado sem detalhes individuais
    reportContainer.innerHTML = `
        <p>📊 RELATÓRIO - CA - ${unitName}</p>
        <p>📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
        <p>💰 Investimento Total: R$ ${totalSpend.toFixed(2).replace('.', ',')}</p>
        <p>💬 Mensagens iniciadas: ${totalConversations}</p>
        <p>💵 Custo por mensagem: R$ ${costPerConversation.replace('.', ',')}</p>
        <p>📢 Alcance Total: ${totalReach.toLocaleString('pt-BR')} pessoas</p>
    `;
    shareWhatsAppBtn.style.display = 'block';
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