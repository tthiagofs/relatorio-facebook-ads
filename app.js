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
const filterBtn = document.getElementById('filterBtn');
const optionsModal = document.getElementById('optionsModal');
const closeOptionsModalBtn = document.getElementById('closeOptionsModal');
const filterSelectionModal = document.getElementById('filterSelectionModal');
const closeFilterSelectionModalBtn = document.getElementById('closeFilterSelectionModal');

// Mapa para armazenar os nomes das contas, IDs dos ad sets e campanhas
const adAccountsMap = {};
const adSetsMap = {}; // Mapa para armazenar IDs, nomes, campaignId e insights dos ad sets
const campaignsMap = {}; // Mapa para armazenar IDs, nomes e insights das campanhas
let selectedOptions = new Set(); // Conjunto para armazenar opções selecionadas (campanhas ou ad sets)
let activeFilter = null; // 'campaign' ou 'adset'

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

// Função para criar e gerenciar opções clicáveis nos modals com valor gasto
function renderOptions(containerId, options) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (options.length === 0) {
        container.innerHTML = '<p>Nenhuma opção disponível para o período selecionado.</p>';
        return;
    }
    options.forEach(option => {
        const div = document.createElement('div');
        div.className = `filter-option ${selectedOptions.has(option.value) ? 'selected' : ''}`;
        const spend = option.spend !== undefined && option.spend !== null ? parseFloat(option.spend) : 0;
        const spendColor = spend > 0 ? 'green' : 'gray';
        div.innerHTML = `${option.label} <span style="margin-left: 10px; color: ${spendColor};">R$ ${spend.toFixed(2).replace('.', ',')}</span>`;
        div.dataset.value = option.value;
        div.addEventListener('click', () => {
            const value = option.value;
            if (selectedOptions.has(value)) {
                selectedOptions.delete(value);
                div.classList.remove('selected');
            } else {
                selectedOptions.add(value);
                div.classList.add('selected');
            }
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
            FB.api('/me/adaccounts', { fields: 'id,name' }, function(accountResponse) {
                if (accountResponse && !accountResponse.error) {
                    const unitSelect = document.getElementById('unitId');
                    unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
                    accountResponse.data.forEach(account => {
                        adAccountsMap[account.id] = account.name;
                        const option = document.createElement('option');
                        option.value = account.id;
                        option.textContent = account.name;
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

// Carrega os ad sets e campanhas quando o formulário é preenchido
form.addEventListener('input', async function(e) {
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (unitId && startDate && endDate) {
        campaignsMap[unitId] = {};
        adSetsMap[unitId] = {};
        selectedOptions.clear();
        activeFilter = null;
        await Promise.all([
            loadCampaigns(unitId, startDate, endDate),
            loadAdSets(unitId, startDate, endDate)
        ]);
        renderOptions('optionsList', []); // Limpa o modal de opções ao carregar novos dados
    }
});

// Função para carregar campanhas
async function loadCampaigns(unitId, startDate, endDate) {
    FB.api(
        `/${unitId}/campaigns`,
        { fields: 'id,name' },
        async function(campaignResponse) {
            if (campaignResponse && !campaignResponse.error) {
                campaignsMap[unitId] = {};
                const campaignIds = campaignResponse.data.map(camp => camp.id);
                for (const campaignId of campaignIds) {
                    const insights = await getCampaignInsights(campaignId, startDate, endDate);
                    const spend = insights.spend !== undefined && insights.spend !== null ? parseFloat(insights.spend) : 0;
                    campaignsMap[unitId][campaignId] = {
                        name: campaignResponse.data.find(camp => camp.id === campaignId).name.toLowerCase(),
                        insights: { spend: spend }
                    };
                }
            } else {
                console.error('Erro ao carregar campanhas:', campaignResponse.error);
            }
        }
    );
}

// Função para carregar ad sets
async function loadAdSets(unitId, startDate, endDate) {
    FB.api(
        `/${unitId}/adsets`,
        { fields: 'id,name,campaign{id}' },
        async function(adSetResponse) {
            if (adSetResponse && !adSetResponse.error) {
                adSetsMap[unitId] = {};
                const adSetIds = adSetResponse.data.map(set => set.id);
                const batchSize = 50;
                const batches = [];
                for (let i = 0; i < adSetIds.length; i += batchSize) {
                    batches.push(adSetIds.slice(i, i + batchSize));
                }

                const fetchBatchInsights = async (batchIds) => {
                    const timeRange = { since: startDate, until: endDate };
                    const idsString = batchIds.join(',');
                    return new Promise((resolve, reject) => {
                        FB.api(
                            `/?ids=${idsString}&fields=insights{spend,actions,reach}&time_range=${JSON.stringify(timeRange)}`,
                            function(response) {
                                if (response && !response.error) {
                                    const validIds = [];
                                    for (const id in response) {
                                        const insights = response[id].insights?.data?.[0] || {};
                                        const spend = insights.spend !== undefined && insights.spend !== null ? parseFloat(insights.spend) : 0;
                                        if (spend > 0) {
                                            validIds.push(id);
                                            const adSet = adSetResponse.data.find(set => set.id === id);
                                            adSetsMap[unitId][id] = {
                                                name: adSet.name.toLowerCase(),
                                                campaignId: adSet.campaign ? adSet.campaign.id.toString() : null,
                                                insights: { spend: spend, actions: insights.actions || [], reach: insights.reach || 0 }
                                            };
                                        }
                                    }
                                    resolve(validIds);
                                } else {
                                    console.error('Erro ao carregar insights batch para ad sets:', response.error);
                                    resolve([]);
                                }
                            }
                        );
                    });
                };

                await Promise.all(batches.map(batch => fetchBatchInsights(batch)));
            } else {
                console.error('Erro ao carregar ad sets:', adSetResponse.error);
            }
        }
    );
}

// Função para atualizar as opções no modal inferior
function updateOptions() {
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (unitId && startDate && endDate) {
        let options = [];
        if (activeFilter === 'campaign') {
            options = Object.keys(campaignsMap[unitId] || {}).map(id => ({
                value: id,
                label: campaignsMap[unitId][id].name,
                spend: campaignsMap[unitId][id].insights.spend
            }));
        } else if (activeFilter === 'adset') {
            options = Object.keys(adSetsMap[unitId] || {}).map(id => ({
                value: id,
                label: adSetsMap[unitId][id].name,
                spend: adSetsMap[unitId][id].insights.spend
            }));
        }
        renderOptions('optionsList', options);
    }
}

// Funções para obter insights
async function getCampaignInsights(campaignId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        FB.api(
            `/${campaignId}/insights`,
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, level: 'campaign' },
            function(response) {
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
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate } },
            function(response) {
                if (response && !response.error && response.data && response.data.length > 0) {
                    resolve(response.data[0]);
                } else {
                    console.warn(`Nenhum insight válido retornado para ad set ${adSetId}:`, response.error || 'Dados ausentes');
                    resolve({ spend: '0', actions: [], reach: '0' });
                }
            }
        );
    });
}

// Configurar eventos para os modais
filterBtn.addEventListener('click', () => {
    toggleModal(filterSelectionModal, true);
});

closeFilterSelectionModalBtn.addEventListener('click', () => {
    toggleModal(filterSelectionModal, false);
});

document.getElementById('filterCampaign').addEventListener('change', () => {
    if (document.getElementById('filterCampaign').checked) {
        document.getElementById('filterAdSet').checked = false;
        activeFilter = 'campaign';
        selectedOptions.clear();
        updateOptions();
        toggleModal(filterSelectionModal, false);
        toggleModal(optionsModal, true);
    }
});

document.getElementById('filterAdSet').addEventListener('change', () => {
    if (document.getElementById('filterAdSet').checked) {
        document.getElementById('filterCampaign').checked = false;
        activeFilter = 'adset';
        selectedOptions.clear();
        updateOptions();
        toggleModal(filterSelectionModal, false);
        toggleModal(optionsModal, true);
    }
});

closeOptionsModalBtn.addEventListener('click', () => {
    toggleModal(optionsModal, false);
});

// Geração do relatório com soma consolidada dos ad sets filtrados
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

    if (selectedOptions.size > 0) {
        if (activeFilter === 'campaign') {
            const adSetIds = Object.keys(adSetsMap[unitId] || {}).filter(id => {
                const adSetData = adSetsMap[unitId][id];
                const campaignId = adSetData && adSetData.campaignId ? adSetData.campaignId.toString() : null;
                return campaignId && selectedOptions.has(campaignId);
            });
            for (const adSetId of adSetIds) {
                const insights = await getAdSetInsights(adSetId, startDate, endDate);
                totalSpend += parseFloat(insights.spend || 0) || 0;
                totalReach += parseInt(insights.reach || 0) || 0;
                (insights.actions || []).forEach(action => {
                    if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                        totalConversations += parseInt(action.value) || 0;
                    }
                });
            }
        } else if (activeFilter === 'adset') {
            for (const adSetId of selectedOptions) {
                const insights = await getAdSetInsights(adSetId, startDate, endDate);
                totalSpend += parseFloat(insights.spend || 0) || 0;
                totalReach += parseInt(insights.reach || 0) || 0;
                (insights.actions || []).forEach(action => {
                    if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                        totalConversations += parseInt(action.value) || 0;
                    }
                });
            }
        }
    } else {
        FB.api(
            `/${unitId}/insights`,
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, level: 'account' },
            function(response) {
                if (response && !response.error && response.data.length > 0) {
                    response.data.forEach(data => {
                        totalSpend += parseFloat(data.spend || 0) || 0;
                        totalReach += parseInt(data.reach || 0) || 0;
                        (data.actions || []).forEach(action => {
                            if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                                totalConversations += parseInt(action.value) || 0;
                            }
                        });
                    });
                    const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';
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
                    if (response.error) console.error('Erro da API:', response.error);
                    shareWhatsAppBtn.style.display = 'none';
                }
            }
        );
        return;
    }

    const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';
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