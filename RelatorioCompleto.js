const mainContent = document.getElementById('mainContent');
const form = document.getElementById('form');
const reportContainer = document.getElementById('reportContainer');
const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
const filterCampaignsBtn = document.getElementById('filterCampaigns');
const filterAdSetsBtn = document.getElementById('filterAdSets');
const comparePeriodsBtn = document.getElementById('comparePeriods');
const campaignsModal = document.getElementById('campaignsModal');
const adSetsModal = document.getElementById('adSetsModal');
const comparisonModal = document.getElementById('comparisonModal');
const closeCampaignsModalBtn = document.getElementById('closeCampaignsModal');
const closeAdSetsModalBtn = document.getElementById('closeAdSetsModal');
const confirmComparisonBtn = document.getElementById('confirmComparison');
const cancelComparisonBtn = document.getElementById('cancelComparison');

// Mapa para armazenar os nomes das contas, IDs dos ad sets e campanhas
const adAccountsMap = JSON.parse(localStorage.getItem('adAccountsMap')) || {};
const adSetsMap = {};
const campaignsMap = {};
let selectedCampaigns = new Set();
let selectedAdSets = new Set();
let isCampaignFilterActive = false;
let isAdSetFilterActive = false;
let isFilterActivated = false;
let campaignSearchText = '';
let adSetSearchText = '';
let currentAccessToken = localStorage.getItem('fbAccessToken') || null;
let comparisonData = null;

const backToReportSelectionBtn = document.getElementById('backToReportSelectionBtn');

backToReportSelectionBtn.addEventListener('click', () => {
    window.location.href = 'index.html?screen=reportSelection';
});

// Verificar se o token de acesso está disponível
if (!currentAccessToken) {
    alert('Você precisa fazer login com o Facebook primeiro. Redirecionando para a página inicial.');
    setTimeout(() => {
        window.location.replace('index.html');
    }, 100);
    throw new Error('Token de acesso não encontrado.');
}

// Preencher o dropdown de unidades
const unitSelect = document.getElementById('unitId');
unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
if (Object.keys(adAccountsMap).length === 0) {
    FB.api('/me/adaccounts', { fields: 'id,name', access_token: currentAccessToken }, function(accountResponse) {
        if (accountResponse && !accountResponse.error) {
            let accounts = accountResponse.data || [];
            accounts.forEach(account => {
                adAccountsMap[account.id] = account.name;
            });

            FB.api('/me/businesses', { fields: 'id,name', access_token: currentAccessToken }, function(businessResponse) {
                if (businessResponse && !businessResponse.error) {
                    const businesses = businessResponse.data || [];
                    let businessAccountsPromises = [];

                    businesses.forEach(business => {
                        businessAccountsPromises.push(new Promise((resolve) => {
                            FB.api(
                                `/${business.id}/owned_ad_accounts`,
                                { fields: 'id,name', access_token: currentAccessToken },
                                function(ownedAccountResponse) {
                                    if (ownedAccountResponse && !ownedAccountResponse.error) {
                                        const ownedAccounts = ownedAccountResponse.data || [];
                                        resolve(ownedAccounts);
                                    } else {
                                        resolve([]);
                                    }
                                }
                            );
                        }));

                        businessAccountsPromises.push(new Promise((resolve) => {
                            FB.api(
                                `/${business.id}/client_ad_accounts`,
                                { fields: 'id,name', access_token: currentAccessToken },
                                function(clientAccountResponse) {
                                    if (clientAccountResponse && !clientAccountResponse.error) {
                                        const clientAccounts = clientAccountResponse.data || [];
                                        resolve(clientAccounts);
                                    } else {
                                        resolve([]);
                                    }
                                }
                            );
                        }));
                    });

                    Promise.all(businessAccountsPromises).then(businessAccountsArrays => {
                        let allBusinessAccounts = [].concat(...businessAccountsArrays);
                        allBusinessAccounts.forEach(account => {
                            if (!adAccountsMap[account.id]) {
                                adAccountsMap[account.id] = account.name;
                            }
                        });

                        const sortedAccounts = Object.keys(adAccountsMap)
                            .map(accountId => ({
                                id: accountId,
                                name: adAccountsMap[accountId]
                            }))
                            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

                        unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
                        sortedAccounts.forEach(account => {
                            const option = document.createElement('option');
                            option.value = account.id;
                            option.textContent = account.name;
                            unitSelect.appendChild(option);
                        });

                        localStorage.setItem('adAccountsMap', JSON.stringify(adAccountsMap));
                    });
                }
            });
        }
    });
} else {
    const sortedAccounts = Object.keys(adAccountsMap)
        .map(accountId => ({
            id: accountId,
            name: adAccountsMap[accountId]
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    sortedAccounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = account.name;
        unitSelect.appendChild(option);
    });
}

// Função para mostrar/esconder modais e gerenciar estado
function toggleModal(modal, show, isCampaign) {
    if (show && isFilterActivated && ((isCampaign && selectedCampaigns.size === 0) || (!isCampaign && selectedAdSets.size === 0))) {
        return;
    }

    modal.style.display = show ? 'block' : 'none';
    if (show) {
        if (isCampaign) {
            isCampaignFilterActive = true;
            isAdSetFilterActive = false;
            filterAdSetsBtn.disabled = isFilterActivated;
            filterAdSetsBtn.style.cursor = isFilterActivated ? 'not-allowed' : 'pointer';
        } else if (modal === comparisonModal) {
            // Lógica para o modal de comparação (se necessário)
        } else {
            isAdSetFilterActive = true;
            isCampaignFilterActive = false;
            filterCampaignsBtn.disabled = isFilterActivated;
            filterCampaignsBtn.style.cursor = isFilterActivated ? 'not-allowed' : 'pointer';
        }
        if (modal === comparisonModal && comparisonData) {
            if (comparisonData.startDate && comparisonData.endDate) {
                document.querySelector('input[name="comparisonOption"][value="custom"]').checked = true;
                document.getElementById('compareStartDate').value = comparisonData.startDate;
                document.getElementById('compareEndDate').value = comparisonData.endDate;
            } else if (comparisonData.isPrevious) {
                document.querySelector('input[name="comparisonOption"][value="previous"]').checked = true;
            } else {
                document.querySelector('input[name="comparisonOption"][value="none"]').checked = true;
            }
        }
    } else {
        if (isCampaign) {
            isCampaignFilterActive = false;
            if (isFilterActivated && selectedCampaigns.size === 0) {
                isFilterActivated = false;
                filterAdSetsBtn.disabled = false;
                filterAdSetsBtn.style.cursor = 'pointer';
            } else {
                filterAdSetsBtn.disabled = isFilterActivated && selectedCampaigns.size > 0;
                filterAdSetsBtn.style.cursor = isFilterActivated && selectedCampaigns.size > 0 ? 'not-allowed' : 'pointer';
            }
            campaignSearchText = '';
            const campaignSearchInput = document.getElementById('campaignSearch');
            if (campaignSearchInput) campaignSearchInput.value = '';
        } else if (modal === comparisonModal) {
            // Nada a fazer ao fechar o modal de comparação
        } else {
            isAdSetFilterActive = false;
            if (isFilterActivated && selectedAdSets.size === 0) {
                isFilterActivated = false;
                filterCampaignsBtn.disabled = false;
                filterCampaignsBtn.style.cursor = 'pointer';
            } else {
                filterCampaignsBtn.disabled = isFilterActivated && selectedAdSets.size > 0;
                filterCampaignsBtn.style.cursor = isFilterActivated && selectedAdSets.size > 0 ? 'not-allowed' : 'pointer';
            }
            adSetSearchText = '';
            const adSetSearchInput = document.getElementById('adSetSearch');
            if (adSetSearchInput) adSetSearchInput.value = '';
        }
    }
    updateFilterButton();
}

// Função para atualizar o botão de ativação/desativação
function updateFilterButton() {
    const campaignsButton = campaignsModal.querySelector('.btn-filter-toggle');
    const adSetsButton = adSetsModal.querySelector('.btn-filter-toggle');

    if (campaignsButton) {
        campaignsButton.textContent = isFilterActivated && selectedCampaigns.size > 0 ? 'Desativar Seleção' : 'Ativar Seleções';
        campaignsButton.disabled = !isFilterActivated && selectedCampaigns.size === 0;
    }
    if (adSetsButton) {
        adSetsButton.textContent = isFilterActivated && selectedAdSets.size > 0 ? 'Desativar Seleção' : 'Ativar Seleções';
        adSetsButton.disabled = !isFilterActivated && selectedAdSets.size === 0;
    }
    filterCampaignsBtn.disabled = isFilterActivated && (selectedAdSets.size > 0 || (selectedCampaigns.size === 0 && !isCampaignFilterActive));
    filterAdSetsBtn.disabled = isFilterActivated && (selectedCampaigns.size > 0 || (selectedAdSets.size === 0 && !isAdSetFilterActive));
    filterCampaignsBtn.style.cursor = filterCampaignsBtn.disabled ? 'not-allowed' : 'pointer';
    filterAdSetsBtn.style.cursor = filterAdSetsBtn.disabled ? 'not-allowed' : 'pointer';
}

// Função para criar e gerenciar opções clicáveis nos modals
function renderOptions(containerId, options, selectedSet, isCampaign) {
    const container = document.getElementById(containerId);
    const searchInput = document.getElementById(isCampaign ? 'campaignSearch' : 'adSetSearch');
    container.innerHTML = options.length === 0 ? '<p>Carregando dados, por favor aguarde...</p>' : '';
    if (options.length > 0) {
        function filterOptions(searchText) {
            const filteredOptions = options.filter(option => 
                option.label.toLowerCase().includes(searchText.toLowerCase())
            );
            renderFilteredOptions(filteredOptions, selectedSet, isCampaign);
        }

        function renderFilteredOptions(filteredOptions, set, isCampaignParam) {
            container.innerHTML = '';
            filteredOptions.forEach(option => {
                const div = document.createElement('div');
                div.className = `filter-option ${set.has(option.value) ? 'selected' : ''}`;
                const spend = option.spend !== undefined && option.spend !== null ? parseFloat(option.spend) : 0;
                const spendColor = spend > 0 ? 'green' : 'gray';
                div.innerHTML = `${option.label} <span style="margin-left: 10px; color: ${spendColor};">R$ ${spend.toFixed(2).replace('.', ',')}</span>`;
                div.dataset.value = option.value;
                div.addEventListener('click', () => {
                    const value = option.value;
                    if (set.has(value)) {
                        set.delete(value);
                        div.classList.remove('selected');
                    } else {
                        set.add(value);
                        div.classList.add('selected');
                    }
                    if (set.size === 0 && isFilterActivated) {
                        isFilterActivated = false;
                        if (isCampaignParam) {
                            isCampaignFilterActive = false;
                            filterAdSetsBtn.disabled = false;
                            filterAdSetsBtn.style.cursor = 'pointer';
                        } else {
                            isAdSetFilterActive = false;
                            filterCampaignsBtn.disabled = false;
                            filterCampaignsBtn.style.cursor = 'pointer';
                        }
                    }
                    updateFilterButton();
                });
                container.appendChild(div);
            });

            const existingButton = container.querySelector('.btn-filter-toggle');
            if (existingButton) existingButton.remove();

            const filterButton = document.createElement('button');
            filterButton.textContent = isFilterActivated && (isCampaignParam ? selectedCampaigns.size > 0 : selectedAdSets.size > 0) ? 'Desativar Seleção' : 'Ativar Seleções';
            filterButton.className = 'btn-filter-toggle';
            filterButton.disabled = (isCampaignParam ? selectedCampaigns.size === 0 : selectedAdSets.size === 0);
            filterButton.addEventListener('click', () => {
                if (isFilterActivated && (isCampaignParam ? selectedCampaigns.size > 0 : selectedAdSets.size > 0)) {
                    isFilterActivated = false;
                    if (isCampaignParam) {
                        selectedCampaigns.clear();
                        isCampaignFilterActive = false;
                    } else {
                        selectedAdSets.clear();
                        isAdSetFilterActive = false;
                    }
                    filterCampaignsBtn.disabled = false;
                    filterAdSetsBtn.disabled = false;
                    filterCampaignsBtn.style.cursor = 'pointer';
                    filterAdSetsBtn.style.cursor = 'pointer';
                } else if (isCampaignParam ? selectedCampaigns.size > 0 : selectedAdSets.size > 0) {
                    isFilterActivated = true;
                    if (isCampaignParam) {
                        isCampaignFilterActive = true;
                        isAdSetFilterActive = false;
                        filterAdSetsBtn.disabled = true;
                        filterAdSetsBtn.style.cursor = 'not-allowed';
                    } else {
                        isAdSetFilterActive = true;
                        isCampaignFilterActive = false;
                        filterCampaignsBtn.disabled = true;
                        filterCampaignsBtn.style.cursor = 'not-allowed';
                    }
                }
                renderFilteredOptions(filteredOptions, set, isCampaignParam);
                updateFilterButton();
            });
            container.appendChild(filterButton);
        }

        const currentSearchText = isCampaign ? campaignSearchText : adSetSearchText;
        if (currentSearchText) {
            filterOptions(currentSearchText);
        } else {
            renderFilteredOptions(options, selectedSet, isCampaign);
        }

        if (searchInput) {
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);
            newSearchInput.addEventListener('input', (e) => {
                const searchText = e.target.value;
                if (isCampaign) {
                    campaignSearchText = searchText;
                } else {
                    adSetSearchText = searchText;
                }
                filterOptions(searchText);
            });
            newSearchInput.value = currentSearchText;
        }
    } else {
        container.innerHTML = '<p>Nenhum dado encontrado para o período selecionado. Tente novamente ou faça login novamente.</p>';
    }
}

// Carregar campanhas e ad sets quando o formulário é preenchido
form.addEventListener('input', async function(e) {
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (unitId && startDate && endDate) {
        if (isCampaignFilterActive && campaignSearchText) {
            return;
        }

        campaignsMap[unitId] = {};
        adSetsMap[unitId] = {};
        selectedCampaigns.clear();
        selectedAdSets.clear();
        isCampaignFilterActive = false;
        isAdSetFilterActive = false;
        isFilterActivated = false;
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
    if (typeof FB === 'undefined') {
        console.error('Facebook SDK não está inicializado.');
        return;
    }
    FB.api(
        `/${unitId}/campaigns`,
        { fields: 'id,name', access_token: currentAccessToken },
        async function(campaignResponse) {
            if (campaignResponse && !campaignResponse.error) {
                campaignsMap[unitId] = {};
                const campaignIds = campaignResponse.data.map(camp => camp.id);
                const insightPromises = campaignIds.map(campaignId => getCampaignInsights(campaignId, startDate, endDate));

                const insights = await Promise.all(insightPromises);
                campaignIds.forEach((campaignId, index) => {
                    const spend = insights[index].spend !== undefined && insights[index].spend !== null ? parseFloat(insights[index].spend) : 0;
                    campaignsMap[unitId][campaignId] = {
                        name: campaignResponse.data.find(camp => camp.id === campaignId).name.toLowerCase(),
                        insights: { spend: spend }
                    };
                });

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
    if (typeof FB === 'undefined') {
        console.error('Facebook SDK não está inicializado.');
        return;
    }
    if (adSetsMap[unitId] && Object.keys(adSetsMap[unitId]).length > 0) {
        if (!isCampaignFilterActive) {
            const adSetOptions = Object.keys(adSetsMap[unitId])
                .filter(id => adSetsMap[unitId][id].insights.spend > 0)
                .map(id => ({
                    value: id,
                    label: adSetsMap[unitId][id].name,
                    spend: adSetsMap[unitId][id].insights.spend
                }));
            renderOptions('adSetsList', adSetOptions, selectedAdSets, false);
        }
        return;
    }

    FB.api(
        `/${unitId}/adsets`,
        { fields: 'id,name', limit: 50, access_token: currentAccessToken },
        async function(adSetResponse) {
            if (adSetResponse && !adSetResponse.error) {
                adSetsMap[unitId] = {};
                const adSetIds = adSetResponse.data.map(set => set.id);

                const insightPromises = adSetIds.map(adSetId => getAdSetInsights(adSetId, startDate, endDate));
                const insights = await Promise.all(insightPromises);

                adSetIds.forEach((adSetId, index) => {
                    let spend = 0;
                    if (insights[index].spend !== undefined && insights[index].spend !== null) {
                        spend = parseFloat(insights[index].spend) || 0;
                        if (isNaN(spend)) {
                            spend = 0;
                        }
                    }
                    if (spend > 0) {
                        const adSet = adSetResponse.data.find(set => set.id === adSetId);
                        adSetsMap[unitId][adSetId] = {
                            name: adSet.name.toLowerCase(),
                            insights: { spend: spend, actions: insights[index].actions || [], reach: insights[index].reach || 0 }
                        };
                    }
                });

                if (!isCampaignFilterActive) {
                    const adSetOptions = Object.keys(adSetsMap[unitId])
                        .filter(id => adSetsMap[unitId][id].insights.spend > 0)
                        .map(id => ({
                            value: id,
                            label: adSetsMap[unitId][id].name,
                            spend: adSetsMap[unitId][id].insights.spend
                        }));
                    renderOptions('adSetsList', adSetOptions, selectedAdSets, false);
                }
            } else {
                console.error('Erro ao carregar ad sets:', adSetResponse.error);
                const adSetsList = document.getElementById('adSetsList');
                if (adSetsList) {
                    adSetsList.innerHTML = '<p>Erro ao carregar os conjuntos de anúncios. Tente novamente ou faça login novamente.</p>';
                }
            }
        }
    );
}

// Função para obter insights das campanhas
async function getCampaignInsights(campaignId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        FB.api(
            `/${campaignId}/insights`,
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, level: 'campaign', access_token: currentAccessToken },
            function(response) {
                if (response && !response.error) {
                    resolve(response.data[0] || {});
                } else {
                    resolve({});
                }
            }
        );
    });
}

// Função para obter insights dos ad sets
async function getAdSetInsights(adSetId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        FB.api(
            `/${adSetId}/insights`,
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, access_token: currentAccessToken },
            function(response) {
                if (response && !response.error && response.data && response.data.length > 0) {
                    resolve(response.data[0]);
                } else {
                    resolve({ spend: '0', actions: [], reach: '0' });
                }
            }
        );
    });
}

// Configurar eventos para os botões de filtro
filterCampaignsBtn.addEventListener('click', () => {
    if (isFilterActivated && selectedAdSets.size > 0) return;
    isCampaignFilterActive = true;
    toggleModal(campaignsModal, true, true);
});

filterAdSetsBtn.addEventListener('click', () => {
    if (isFilterActivated && selectedCampaigns.size > 0) return;
    isAdSetFilterActive = true;
    toggleModal(adSetsModal, true, false);
});

comparePeriodsBtn.addEventListener('click', () => {
    toggleModal(comparisonModal, true, false);
});

closeCampaignsModalBtn.addEventListener('click', () => {
    isCampaignFilterActive = false;
    toggleModal(campaignsModal, false, true);
    updateFilterButton();
});

closeAdSetsModalBtn.addEventListener('click', () => {
    isAdSetFilterActive = false;
    toggleModal(adSetsModal, false, false);
    updateFilterButton();
});

cancelComparisonBtn.addEventListener('click', () => {
    toggleModal(comparisonModal, false, false);
});

confirmComparisonBtn.addEventListener('click', () => {
    const comparisonOption = document.querySelector('input[name="comparisonOption"]:checked').value;
    if (comparisonOption === 'custom') {
        const compareStartDate = document.getElementById('compareStartDate').value;
        const compareEndDate = document.getElementById('compareEndDate').value;
        if (compareStartDate && compareEndDate) {
            comparisonData = { startDate: compareStartDate, endDate: compareEndDate };
        } else {
            comparisonData = null;
        }
    } else if (comparisonOption === 'previous') {
        comparisonData = { isPrevious: true };
    } else {
        comparisonData = null;
    }
    toggleModal(comparisonModal, false, false);
});

// Geração do relatório
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
    let comparisonSpend = 0;
    let comparisonConversations = 0;
    let comparisonReach = 0;

    if (isFilterActivated) {
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
        }
    } else {
        FB.api(
            `/${unitId}/insights`,
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, level: 'account', access_token: currentAccessToken },
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

                    if (comparisonData) {
                        let compareStartDate = startDate;
                        let compareEndDate = endDate;
                        if (comparisonData.startDate && comparisonData.endDate) {
                            compareStartDate = comparisonData.startDate;
                            compareEndDate = comparisonData.endDate;
                        } else if (comparisonData.isPrevious) {
                            const start = new Date(startDate);
                            const end = new Date(endDate);
                            start.setFullYear(start.getFullYear() - 1);
                            end.setFullYear(end.getFullYear() - 1);
                            compareStartDate = start.toISOString().split('T')[0];
                            compareEndDate = end.toISOString().split('T')[0];
                        }

                        FB.api(
                            `/${unitId}/insights`,
                            { fields: ['spend', 'actions', 'reach'], time_range: { since: compareStartDate, until: compareEndDate }, level: 'account', access_token: currentAccessToken },
                            function(comparisonResponse) {
                                if (comparisonResponse && !comparisonResponse.error && comparisonResponse.data.length > 0) {
                                    comparisonResponse.data.forEach(data => {
                                        if (data.spend) {
                                            comparisonSpend += parseFloat(data.spend) || 0;
                                        }
                                        if (data.reach) {
                                            comparisonReach += parseInt(data.reach) || 0;
                                        }
                                        (data.actions || []).forEach(action => {
                                            if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                                                comparisonConversations += parseInt(action.value) || 0;
                                            }
                                        });
                                    });
                                }

                                renderCompleteReport(unitName, startDate, endDate, totalSpend, totalConversations, totalReach, comparisonSpend, comparisonConversations, comparisonReach, compareStartDate, compareEndDate);
                            }
                        );
                    } else {
                        renderCompleteReport(unitName, startDate, endDate, totalSpend, totalConversations, totalReach);
                    }
                } else {
                    reportContainer.innerHTML = '<p>Nenhum dado encontrado para os filtros aplicados ou erro na requisição.</p>';
                    shareWhatsAppBtn.style.display = 'none';
                }
            }
        );
        return;
    }

    renderCompleteReport(unitName, startDate, endDate, totalSpend, totalConversations, totalReach);
});

// Função para renderizar o relatório completo
function renderCompleteReport(unitName, startDate, endDate, totalSpend, totalConversations, totalReach, comparisonSpend = 0, comparisonConversations = 0, comparisonReach = 0, compareStartDate = '', compareEndDate = '') {
    const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';
    let comparisonCostPerConversation = comparisonConversations > 0 ? (comparisonSpend / comparisonConversations).toFixed(2) : '0';
    if (comparisonCostPerConversation === '0' && comparisonConversations === 0) comparisonCostPerConversation = '-';

    const spendChange = comparisonSpend > 0 ? ((totalSpend - comparisonSpend) / comparisonSpend * 100).toFixed(2) : 0;
    const conversationChange = comparisonConversations > 0 ? ((totalConversations - comparisonConversations) / comparisonConversations * 100).toFixed(2) : 0;
    const reachChange = comparisonReach > 0 ? ((totalReach - comparisonReach) / comparisonReach * 100).toFixed(2) : 0;

    let reportHtml = `
        <div class="report-header">
            <h2>📊 RELATÓRIO COMPLETO - CA - ${unitName}</h2>
            <p>📅 Período Principal: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
    `;

    if (compareStartDate && compareEndDate) {
        reportHtml += `<p>📅 Período de Comparação: ${compareStartDate.split('-').reverse().join('/')} a ${compareEndDate.split('-').reverse().join('/')}</p>`;
    }

    reportHtml += `
        </div>
        <div class="metrics-grid">
            <div class="metric-card investment">
                <div class="metric-label">Investimento Total</div>
                <div class="metric-value">R$ ${totalSpend.toFixed(2).replace('.', ',')}</div>
                ${comparisonSpend > 0 ? `<div class="metric-comparison ${spendChange >= 0 ? 'increase' : 'decrease'}">${spendChange}% ${spendChange >= 0 ? '↑' : '↓'}</div>` : ''}
            </div>
            <div class="metric-card messages">
                <div class="metric-label">Mensagens Iniciadas</div>
                <div class="metric-value">${totalConversations.toLocaleString('pt-BR')}</div>
                ${comparisonConversations > 0 ? `<div class="metric-comparison ${conversationChange >= 0 ? 'increase' : 'decrease'}">${conversationChange}% ${conversationChange >= 0 ? '↑' : '↓'}</div>` : ''}
            </div>
            <div class="metric-card cost">
                <div class="metric-label">Custo por Mensagem</div>
                <div class="metric-value">R$ ${costPerConversation.replace('.', ',')}</div>
                ${comparisonCostPerConversation !== '-' ? `<div class="metric-comparison ${(costPerConversation - comparisonCostPerConversation) >= 0 ? 'decrease' : 'increase'}">${((costPerConversation - comparisonCostPerConversation) / comparisonCostPerConversation * 100).toFixed(2)}% ${(costPerConversation - comparisonCostPerConversation) >= 0 ? '↑' : '↓'}</div>` : ''}
            </div>
            <div class="metric-card reach">
                <div class="metric-label">Alcance Total</div>
                <div class="metric-value">${totalReach.toLocaleString('pt-BR')} pessoas</div>
                ${comparisonReach > 0 ? `<div class="metric-comparison ${reachChange >= 0 ? 'increase' : 'decrease'}">${reachChange}% ${reachChange >= 0 ? '↑' : '↓'}</div>` : ''}
            </div>
        </div>
    `;

    reportContainer.innerHTML = reportHtml;
    shareWhatsAppBtn.style.display = 'block';
}

// Compartilhar no WhatsApp
shareWhatsAppBtn.addEventListener('click', () => {
    const reportText = reportContainer.innerText;
    const encodedText = encodeURIComponent(reportText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
});