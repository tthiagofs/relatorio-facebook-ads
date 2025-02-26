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
const filterCampaignsBtn = document.getElementById('filterCampaigns');
const filterAdSetsBtn = document.getElementById('filterAdSets');
const campaignsModal = document.getElementById('campaignsModal');
const adSetsModal = document.getElementById('adSetsModal');
const closeCampaignsModalBtn = document.getElementById('closeCampaignsModal');
const closeAdSetsModalBtn = document.getElementById('closeAdSetsModal');

// Mapa para armazenar os nomes das contas, IDs dos ad sets e campanhas
const adAccountsMap = {};
const adSetsMap = {}; // Mapa para armazenar IDs, nomes e insights dos ad sets
const campaignsMap = {}; // Mapa para armazenar IDs e nomes das campanhas
let selectedCampaigns = new Set(); // Conjunto para armazenar campanhas selecionadas
let selectedAdSets = new Set(); // Conjunto para armazenar ad sets selecionados

// Função para alternar telas
function showScreen(screen) {
    appLoginScreen.style.display = 'none';
    reportSelectionScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    mainContent.style.display = 'none';
    screen.style.display = 'block';
}

// Função para mostrar/esconder modais
function toggleModal(modal, show) {
    modal.style.display = show ? 'block' : 'none';
}

// Função para criar e gerenciar opções clicáveis nos modals
function renderOptions(containerId, options, selectedSet, callback) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    options.forEach(option => {
        const div = document.createElement('div');
        div.className = `filter-option ${selectedSet.has(option.value) ? 'selected' : ''}`;
        div.textContent = option.label;
        div.dataset.value = option.value;
        div.addEventListener('click', () => {
            const value = option.value;
            if (selectedSet.has(value)) {
                selectedSet.delete(value);
                div.classList.remove('selected');
            } else {
                selectedSet.add(value);
                div.classList.add('selected');
            }
            callback(selectedSet);
        });
        container.appendChild(div);
    });
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

// Carrega os ad sets, campanhas e atualiza os modais quando o formulário é preenchido
form.addEventListener('input', async function(e) {
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (unitId && startDate && endDate) {
        // Carrega ad sets e campanhas
        FB.api(`/${unitId}/adsets`, { fields: 'id,name,campaign{id,name}' }, function(adSetResponse) {
            if (adSetResponse && !adSetResponse.error) {
                adSetsMap[unitId] = {}; // Limpa ou inicializa o mapa para esta unidade
                campaignsMap[unitId] = {}; // Limpa ou inicializa o mapa para esta unidade

                adSetResponse.data.forEach(adSet => {
                    adSetsMap[unitId][adSet.id] = adSet.name.toLowerCase(); // Armazena IDs e nomes dos ad sets
                    if (adSet.campaign && adSet.campaign.id) {
                        campaignsMap[unitId][adSet.campaign.id] = adSet.campaign.name.toLowerCase();
                    }
                });

                // Carrega insights temporariamente para filtrar por spend > 0
                const fetchInsights = async (ids, type) => {
                    const validIds = [];
                    for (const id of ids) {
                        const insights = await (type === 'campaign' ? getCampaignInsights : getAdSetInsights)(id, startDate, endDate);
                        if (insights && parseFloat(insights.spend || 0) > 0) {
                            validIds.push(id);
                        }
                    }
                    return validIds;
                };

                // Filtra campanhas com spend > 0
                const campaignIds = Object.keys(campaignsMap[unitId] || {});
                fetchInsights(campaignIds, 'campaign').then(validCampaignIds => {
                    const campaignOptions = validCampaignIds.map(id => ({
                        value: id,
                        label: campaignsMap[unitId][id]
                    }));
                    renderOptions('campaignsList', campaignOptions, selectedCampaigns, updateAdSets);

                    // Atualiza ad sets com base nas campanhas selecionadas
                    updateAdSets(selectedCampaigns);
                });
            } else {
                console.error('Erro ao carregar ad sets:', adSetResponse.error);
            }
        });
    }
});

// Função para atualizar as opções de ad sets com base nas campanhas selecionadas
async function updateAdSets(selectedCampaigns) {
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (unitId && startDate && endDate) {
        let validAdSetIds = Object.keys(adSetsMap[unitId] || {});
        if (selectedCampaigns.size > 0) {
            validAdSetIds = validAdSetIds.filter(id => {
                const campaignId = Object.keys(campaignsMap[unitId]).find(campId => 
                    campaignsMap[unitId][campId] === adSetsMap[unitId][id].toLowerCase());
                return campaignId && selectedCampaigns.has(campId);
            });
        }

        const fetchInsights = async (ids) => {
            const validIds = [];
            for (const id of ids) {
                const insights = await getAdSetInsights(id, startDate, endDate);
                if (insights && parseFloat(insights.spend || 0) > 0) {
                    validIds.push(id);
                }
            }
            return validIds;
        };

        fetchInsights(validAdSetIds).then(validAdSetIdsWithSpend => {
            const adSetOptions = validAdSetIdsWithSpend.map(id => ({
                value: id,
                label: adSetsMap[unitId][id]
            }));
            renderOptions('adSetsList', adSetOptions, selectedAdSets, () => {});
        });
    }
}

// Funções para obter insights de campanhas e ad sets
async function getCampaignInsights(campaignId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        FB.api(
            `/${campaignId}/insights`,
            {
                fields: ['spend', 'actions', 'reach'],
                time_range: { since: startDate, until: endDate },
                level: 'campaign'
            },
            function(response) {
                console.log(`Insights para campanha ${campaignId}:`, JSON.stringify(response, null, 2));
                if (response && !response.error) {
                    resolve(response.data[0] || {});
                } else {
                    console.error(`Erro ao carregar insights para campanha ${campaignId}:`, response.error);
                    resolve({});
                }
            }
        );
    });
}

async function getAdSetInsights(adSetId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        FB.api(
            `/${adSetId}/insights`,
            {
                fields: ['spend', 'actions', 'reach'],
                time_range: { since: startDate, until: endDate }
            },
            function(response) {
                console.log(`Insights para ad set ${adSetId}:`, JSON.stringify(response, null, 2));
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

// Configurar eventos para os botões de filtro
filterCampaignsBtn.addEventListener('click', () => toggleModal(campaignsModal, true));
filterAdSetsBtn.addEventListener('click', () => toggleModal(adSetsModal, true));
closeCampaignsModalBtn.addEventListener('click', () => toggleModal(campaignsModal, false));
closeAdSetsModalBtn.addEventListener('click', () => toggleModal(adSetsModal, false));

// Geração do relatório com soma consolidada dos ad sets filtrados por campanha e conjunto com lógica AND
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const unitId = document.getElementById('unitId').value;
    const unitName = adAccountsMap[unitId] || 'Unidade Desconhecida';
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!unitId || !startDate || !endDate) {
        reportContainer.innerHTML = '<p>Preencha todos os campos obrigatórios (Unidade e Período).</p>';
        return;
    }

    let totalSpend = 0;
    let totalConversations = 0;
    let totalReach = 0;

    if (selectedCampaigns.size > 0 || selectedAdSets.size > 0) {
        if (!adSetsMap[unitId] || Object.keys(adSetsMap[unitId]).length === 0 || !campaignsMap[unitId] || Object.keys(campaignsMap[unitId]).length === 0) {
            reportContainer.innerHTML = '<p>Carregue os conjuntos de anúncios e campanhas selecionando a unidade novamente.</p>';
            shareWhatsAppBtn.style.display = 'none';
            return;
        }

        let adSetIdsToProcess = Object.keys(adSetsMap[unitId] || {});
        if (selectedCampaigns.size > 0) {
            adSetIdsToProcess = adSetIdsToProcess.filter(id => {
                const campaignId = Object.keys(campaignsMap[unitId]).find(campId => 
                    campaignsMap[unitId][campId] === adSetsMap[unitId][id].toLowerCase());
                return campaignId && selectedCampaigns.has(campaignId);
            });
        }
        if (selectedAdSets.size > 0) {
            adSetIdsToProcess = adSetIdsToProcess.filter(id => selectedAdSets.has(id));
        }

        if (adSetIdsToProcess.length === 0) {
            reportContainer.innerHTML = '<p>Nenhum conjunto de anúncios encontrado para os filtros especificados.</p>';
            shareWhatsAppBtn.style.display = 'none';
            return;
        }

        // Faz chamadas individuais para os insights de cada ad set filtrado
        for (const adSetId of adSetIdsToProcess) {
            const insights = await getAdSetInsights(adSetId, startDate, endDate);
            console.log(`Insights processados para ad set ${adSetId}:`, insights);
            if (insights && Object.keys(insights).length > 0) {
                const spend = parseFloat(insights.spend || 0) || 0;
                const actions = insights.actions || [];
                const reach = parseInt(insights.reach || 0) || 0;

                let conversations = 0;
                actions.forEach(action => {
                    if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                        conversations = parseInt(action.value) || 0;
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
        // Sem filtros, usa o nível da conta para somar todos os adsets
        FB.api(
            `/${unitId}/insights`,
            {
                fields: ['spend', 'actions', 'reach'],
                time_range: { since: startDate, until: endDate },
                level: 'account'
            },
            function(response) {
                console.log('Resposta insights da conta:', JSON.stringify(response, null, 2));
                if (response && !response.error && response.data.length > 0) {
                    response.data.forEach(data => {
                        const spend = parseFloat(data.spend || 0) || 0;
                        const actions = data.actions || [];
                        const reach = parseInt(data.reach || 0) || 0;

                        let conversations = 0;
                        actions.forEach(action => {
                            if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                                conversations = parseInt(action.value) || 0;
                            }
                        });

                        totalSpend += spend;
                        totalConversations += conversations;
                        totalReach += reach;
                    });

                    const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';

                    // Gera relatório consolidado com soma
                    reportContainer.innerHTML = `
                        <p>📊 RELATÓRIO - CA - ${unitName}</p>
                        <p>📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
                        <p>💰 Investimento Total: R$ ${totalSpend.toFixed(2).replace('.', ',')}</p>
                        <p>💬 Mensagens Iniciadas: ${totalConversations}</p>
                        <p>💵 Custo por Mensagem: R$ ${costPerConversation.replace('.', ',')}</p>
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
    if (totalSpend === 0 && totalConversations === 0 && totalReach === 0) {
        reportContainer.innerHTML = '<p>Nenhum dado válido encontrado para os filtros especificados.</p>';
        shareWhatsAppBtn.style.display = 'none';
        return;
    }

    // Calcula a soma dos valores
    const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';

    // Gera relatório consolidado com soma
    reportContainer.innerHTML = `
        <p>📊 RELATÓRIO - CA - ${unitName}</p>
        <p>📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
        <p>💰 Investimento Total: R$ ${totalSpend.toFixed(2).replace('.', ',')}</p>
        <p>💬 Mensagens Iniciadas: ${totalConversations}</p>
        <p>💵 Custo por Mensagem: R$ ${costPerConversation.replace('.', ',')}</p>
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