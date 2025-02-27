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
const campaignsMap = {}; // Mapa para armazenar IDs, nomes e insights das campanhas
let selectedCampaigns = new Set(); // Conjunto para armazenar campanhas selecionadas
let selectedAdSets = new Set(); // Conjunto para armazenar ad sets selecionados
let isCampaignFilterActive = false;
let isAdSetFilterActive = false;

// Função para alternar telas
function showScreen(screen) {
    appLoginScreen.style.display = 'none';
    reportSelectionScreen.style.display = 'none';
    loginScreen.style.display = 'none';
    mainContent.style.display = 'none';
    screen.style.display = 'block';
}

// Função para mostrar/esconder modais e gerenciar estado
function toggleModal(modal, show, isCampaign) {
    if (show && ((isCampaign && isAdSetFilterActive && selectedAdSets.size > 0) || (!isCampaign && isCampaignFilterActive && selectedCampaigns.size > 0))) {
        return; // Impede abrir o modal se o outro já tiver seleções
    }

    modal.style.display = show ? 'block' : 'none';
    if (show) {
        if (isCampaign) {
            isCampaignFilterActive = true;
            isAdSetFilterActive = false;
            selectedAdSets.clear(); // Limpa seleções de ad sets ao abrir campanhas
            filterAdSetsBtn.disabled = true; // Desativa o botão de conjuntos
            filterAdSetsBtn.style.cursor = 'not-allowed'; // Visual feedback de desativação
        } else {
            isAdSetFilterActive = true;
            isCampaignFilterActive = false;
            selectedCampaigns.clear(); // Limpa seleções de campanhas ao abrir conjuntos
            filterCampaignsBtn.disabled = true; // Desativa o botão de campanhas
            filterCampaignsBtn.style.cursor = 'not-allowed'; // Visual feedback de desativação
        }
    } else {
        if (isCampaign) {
            isCampaignFilterActive = false;
            selectedCampaigns.clear();
            filterAdSetsBtn.disabled = false; // Libera o botão de conjuntos
            filterAdSetsBtn.style.cursor = 'pointer'; // Restaura o cursor
        } else {
            isAdSetFilterActive = false;
            selectedAdSets.clear();
            filterCampaignsBtn.disabled = false; // Libera o botão de campanhas
            filterCampaignsBtn.style.cursor = 'pointer'; // Restaura o cursor
        }
    }
}

// Função para criar e gerenciar opções clicáveis nos modals com valor gasto e botão de desmarcação
function renderOptions(containerId, options, selectedSet, isCampaign) {
    const container = document.getElementById(containerId);
    container.innerHTML = options.length === 0 ? '<p>Buscando...</p>' : ''; // Mostra "Buscando..." enquanto carrega
    if (options.length > 0) {
        options.forEach(option => {
            const div = document.createElement('div');
            div.className = `filter-option ${selectedSet.has(option.value) ? 'selected' : ''}`;
            const spend = option.spend !== undefined && option.spend !== null ? parseFloat(option.spend) : 0;
            const spendColor = spend > 0 ? 'green' : 'gray';
            div.innerHTML = `${option.label} <span style="margin-left: 10px; color: ${spendColor};">R$ ${spend.toFixed(2).replace('.', ',')}</span>`;
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
                // Mantém o outro filtro desativado se houver seleções
                if (isCampaign) {
                    filterAdSetsBtn.disabled = selectedCampaigns.size > 0;
                    filterAdSetsBtn.style.cursor = selectedCampaigns.size > 0 ? 'not-allowed' : 'pointer';
                } else {
                    filterCampaignsBtn.disabled = selectedAdSets.size > 0;
                    filterCampaignsBtn.style.cursor = selectedAdSets.size > 0 ? 'not-allowed' : 'pointer';
                }
            });
            container.appendChild(div);
        });

        // Adiciona botão de "Desmarcar Seleção" ao final do modal
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Desmarcar Seleção';
        clearButton.className = 'btn-clear';
        clearButton.addEventListener('click', () => {
            selectedSet.clear();
            renderOptions(containerId, options, selectedSet, isCampaign); // Re-renderiza para refletir a desmarcação
            // Libera o outro filtro
            if (isCampaign) {
                filterAdSetsBtn.disabled = false;
                filterAdSetsBtn.style.cursor = 'pointer';
            } else {
                filterCampaignsBtn.disabled = false;
                filterCampaignsBtn.style.cursor = 'pointer';
            }
        });
        container.appendChild(clearButton);
    }
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
        selectedCampaigns.clear();
        selectedAdSets.clear();
        isCampaignFilterActive = false;
        isAdSetFilterActive = false;
        filterCampaignsBtn.disabled = false;
        filterAdSetsBtn.disabled = false;
        filterCampaignsBtn.style.cursor = 'pointer';
        filterAdSetsBtn.style.cursor = 'pointer';
        await Promise.all([
            loadCampaigns(unitId, startDate, endDate),
            loadAdSets(unitId, startDate, endDate)
        ]);
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
                if (!isAdSetFilterActive) {
                    const campaignOptions = campaignIds.map(id => ({
                        value: id,
                        label: campaignsMap[unitId][id].name,
                        spend: campaignsMap[unitId][id].insights.spend
                    }));
                    renderOptions('campaignsList', campaignOptions, selectedCampaigns, true);
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
        { fields: 'id,name' },
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

                const validAdSetIds = [].concat(...(await Promise.all(batches.map(batch => fetchBatchInsights(batch)))));
                if (!isCampaignFilterActive) {
                    const adSetOptions = validAdSetIds.map(id => ({
                        value: id,
                        label: adSetsMap[unitId][id].name,
                        spend: adSetsMap[unitId][id].insights.spend
                    }));
                    renderOptions('adSetsList', adSetOptions, selectedAdSets, false);
                }
            } else {
                console.error('Erro ao carregar ad sets:', adSetResponse.error);
            }
        }
    );
}

// Função para atualizar as opções de ad sets (não usada aqui, mas mantida para compatibilidade)
function updateAdSets(selectedCampaigns) {
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (unitId && startDate && endDate && !isAdSetFilterActive) {
        let validAdSetIds = Object.keys(adSetsMap[unitId] || {});
        validAdSetIds = validAdSetIds.filter(id => {
            const adSetData = adSetsMap[unitId][id];
            return adSetData && adSetData.insights.spend > 0; // Filtra apenas ad sets com gastos
        });

        const adSetOptions = validAdSetIds.map(id => ({
            value: id,
            label: adSetsMap[unitId][id].name,
            spend: adSetsMap[unitId][id].insights.spend
        }));
        renderOptions('adSetsList', adSetOptions, selectedAdSets, false);
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

// Configurar eventos para os botões de filtro com exclusão mútua simples
filterCampaignsBtn.addEventListener('click', () => {
    if (isAdSetFilterActive && selectedAdSets.size > 0) return; // Impede abrir se há seleções em ad sets
    isCampaignFilterActive = true;
    toggleModal(campaignsModal, true, true);
});

filterAdSetsBtn.addEventListener('click', () => {
    if (isCampaignFilterActive && selectedCampaigns.size > 0) return; // Impede abrir se há seleções em campanhas
    isAdSetFilterActive = true;
    toggleModal(adSetsModal, true, false);
});

closeCampaignsModalBtn.addEventListener('click', () => {
    isCampaignFilterActive = false;
    selectedCampaigns.clear();
    toggleModal(campaignsModal, false, true);
});

closeAdSetsModalBtn.addEventListener('click', () => {
    isAdSetFilterActive = false;
    selectedAdSets.clear();
    toggleModal(adSetsModal, false, false);
});

// Geração do relatório com soma consolidada dos itens filtrados
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

    if (selectedCampaigns.size > 0) {
        for (const campaignId of selectedCampaigns) {
            const insights = await getCampaignInsights(campaignId, startDate, endDate);
            if (insights && insights.spend) {
                totalSpend += parseFloat(insights.spend) || 0;
            }
            if (insights && insights.reach) {
                totalReach += parseInt(insights.reach) || 0;
            }
            (insights.actions || []).forEach(action => {
                if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                    totalConversations += parseInt(action.value) || 0;
                }
            });
        }
    } else if (selectedAdSets.size > 0) {
        for (const adSetId of selectedAdSets) {
            const insights = await getAdSetInsights(adSetId, startDate, endDate);
            if (insights && insights.spend) {
                totalSpend += parseFloat(insights.spend) || 0;
            }
            if (insights && insights.reach) {
                totalReach += parseInt(insights.reach) || 0;
            }
            (insights.actions || []).forEach(action => {
                if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                    totalConversations += parseInt(action.value) || 0;
                }
            });
        }
    } else {
        FB.api(
            `/${unitId}/insights`,
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, level: 'account' },
            function(response) {
                if (response && !response.error && response.data.length > 0) {
                    response.data.forEach(data => {
                        if (data.spend) {
                            totalSpend += parseFloat(data.spend) || 0;
                        }
                        if (data.reach) {
                            totalReach += parseInt(data.reach) || 0;
                        }
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