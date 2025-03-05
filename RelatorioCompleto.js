const mainContent = document.getElementById('mainContent');
const form = document.getElementById('form');
const reportContainer = document.getElementById('reportContainer');
const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
const filterCampaignsBtn = document.getElementById('filterCampaigns');
const filterAdSetsBtn = document.getElementById('filterAdSets');
const comparePeriodsBtn = document.getElementById('comparePeriods');
const backBtn = document.getElementById('backBtn'); // Botão Voltar
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

// Verificar se o token de acesso está disponível
if (!currentAccessToken) {
    console.log('Token de acesso não encontrado. Redirecionando para a página de login.');
    alert('Você precisa fazer login com o Facebook primeiro. Redirecionando para a página inicial.');
    setTimeout(() => {
        window.location.replace('index.html');
    }, 100);
    throw new Error('Token de acesso não encontrado. Redirecionamento iniciado.');
}

// Preencher o dropdown de unidades com os dados do localStorage
const unitSelect = document.getElementById('unitId');
unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
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
        } else {
            isAdSetFilterActive = true;
            isCampaignFilterActive = false;
            filterCampaignsBtn.disabled = isFilterActivated;
            filterCampaignsBtn.style.cursor = isFilterActivated ? 'not-allowed' : 'pointer';
        }
        // Ao abrir o modal de comparação, restaurar a seleção anterior, se houver
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
            // Não limpar os campos ou comparisonData aqui, apenas fechar o modal
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

// Função para criar e gerenciar opções clicáveis nos modals com valor gasto e pesquisa
function renderOptions(containerId, options, selectedSet, isCampaign) {
    const container = document.getElementById(containerId);
    const searchInput = document.getElementById(isCampaign ? 'campaignSearch' : 'adSetSearch');
    container.innerHTML = options.length === 0 ? '<p>Carregando dados, por favor aguarde...</p>' : '';
    console.log(`Renderizando opções para ${isCampaign ? 'campanhas' : 'conjuntos'} - Total de opções: ${options.length}`);
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
        console.warn(`Nenhuma opção disponível para renderizar em ${containerId}`);
        container.innerHTML = '<p>Nenhum dado encontrado para o período selecionado. Tente novamente ou faça login novamente.</p>';
    }
}

// Carrega os ad sets e campanhas quando o formulário é preenchido
form.addEventListener('input', async function(e) {
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (unitId && startDate && endDate) {
        if (isCampaignFilterActive && campaignSearchText) {
            console.log('Modal de campanhas aberto com filtro ativo, evitando re-renderização.');
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
    const startTime = performance.now();
    console.log(`Iniciando carregamento de campanhas para unitId: ${unitId}, período: ${startDate} a ${endDate}`);
    FB.api(
        `/${unitId}/campaigns`,
        { fields: 'id,name', access_token: currentAccessToken },
        async function(campaignResponse) {
            if (campaignResponse && !campaignResponse.error) {
                console.log(`Resposta da API para campanhas:`, campaignResponse);
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

                const endTime = performance.now();
                console.log(`Carregamento de campanhas concluído em ${(endTime - startTime) / 1000} segundos`);
            } else {
                console.error('Erro ao carregar campanhas:', campaignResponse.error);
                const endTime = performance.now();
                console.log(`Carregamento de campanhas falhou após ${(endTime - startTime) / 1000} segundos`);
            }
        }
    );
}

// Função para carregar ad sets
async function loadAdSets(unitId, startDate, endDate) {
    const startTime = performance.now();
    console.log(`Iniciando carregamento de ad sets para unitId: ${unitId}, período: ${startDate} a ${endDate}`);
    
    if (adSetsMap[unitId] && Object.keys(adSetsMap[unitId]).length > 0) {
        console.log(`Ad sets já carregados para unitId: ${unitId}, reutilizando dados existentes.`);
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
                console.log(`Resposta da API para ad sets:`, adSetResponse);
                adSetsMap[unitId] = {};
                const adSetIds = adSetResponse.data.map(set => set.id);

                const insightPromises = adSetIds.map(adSetId => getAdSetInsights(adSetId, startDate, endDate));
                const insights = await Promise.all(insightPromises);

                adSetIds.forEach((adSetId, index) => {
                    let spend = 0;
                    if (insights[index].spend !== undefined && insights[index].spend !== null) {
                        spend = parseFloat(insights[index].spend) || 0;
                        if (isNaN(spend)) {
                            console.warn(`Valor inválido de spend para ad set ${adSetId}: ${insights[index].spend}`);
                            spend = 0;
                        }
                    }
                    console.log(`Spend para ad set ${adSetId}: ${spend}`);
                    if (spend > 0) {
                        const adSet = adSetResponse.data.find(set => set.id === adSetId);
                        adSetsMap[unitId][adSetId] = {
                            name: adSet.name.toLowerCase(),
                            insights: { spend: spend, actions: insights[index].actions || [], reach: insights[index].reach || 0 }
                        };
                    }
                });

                console.log(`adSetsMap[${unitId}] após carregamento:`, adSetsMap[unitId]);

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

                const endTime = performance.now();
                console.log(`Carregamento de ad sets concluído em ${(endTime - startTime) / 1000} segundos`);
            } else {
                console.error('Erro ao carregar ad sets. Detalhes:', adSetResponse.error);
                const endTime = performance.now();
                console.log(`Carregamento de ad sets falhou após ${(endTime - startTime) / 1000} segundos`);
                const adSetsList = document.getElementById('adSetsList');
                if (adSetsList) {
                    adSetsList.innerHTML = '<p>Erro ao carregar os conjuntos de anúncios. Tente novamente ou faça login novamente.</p>';
                }
            }
        }
    );
}

// Função para atualizar as opções de ad sets
function updateAdSets(selectedCampaigns) {
    const unitId = document.getElementById('unitId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (unitId && startDate && endDate && !isAdSetFilterActive) {
        let validAdSetIds = Object.keys(adSetsMap[unitId] || {});
        validAdSetIds = validAdSetIds.filter(id => {
            const adSetData = adSetsMap[unitId][id];
            return adSetData && adSetData.insights.spend > 0;
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
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, level: 'campaign', access_token: currentAccessToken },
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
            { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, access_token: currentAccessToken },
            function(response) {
                if (response && !response.error && response.data && response.data.length > 0) {
                    console.log(`Insights para ad set ${adSetId}:`, response.data[0]);
                    resolve(response.data[0]);
                } else {
                    console.warn(`Nenhum insight válido retornado para ad set ${adSetId}:`, response.error || 'Dados ausentes');
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

// Função para calcular o período anterior automaticamente
function calculatePreviousPeriod(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = (end - start) / (1000 * 60 * 60 * 24); // Diferença em dias

    const previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1); // Um dia antes do startDate

    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - diffDays); // Mesmo número de dias antes

    return {
        start: previousStart.toISOString().split('T')[0],
        end: previousEnd.toISOString().split('T')[0]
    };
}

// Configurar evento para o botão "Período de Comparação"
comparePeriodsBtn.addEventListener('click', () => {
    toggleModal(comparisonModal, true, false);
});

// Configurar eventos para o modal de comparação
confirmComparisonBtn.addEventListener('click', async () => {
    const option = document.querySelector('input[name="comparisonOption"]:checked').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (option === 'custom') {
        const compareStartDate = document.getElementById('compareStartDate').value;
        const compareEndDate = document.getElementById('compareEndDate').value;
        if (!compareStartDate || !compareEndDate) {
            alert('Por favor, preencha as datas do período de comparação.');
            return;
        }
        comparisonData = { startDate: compareStartDate, endDate: compareEndDate, isPrevious: false };
    } else if (option === 'previous') {
        const previousPeriod = calculatePreviousPeriod(startDate, endDate);
        comparisonData = { startDate: previousPeriod.start, endDate: previousPeriod.end, isPrevious: true };
    } else {
        comparisonData = null;
    }

    console.log('Dados de comparação salvos:', comparisonData); // Depuração
    toggleModal(comparisonModal, false, false);
});

cancelComparisonBtn.addEventListener('click', () => {
    comparisonData = null; // Limpar dados de comparação ao cancelar
    console.log('Comparação cancelada. Dados de comparação limpos:', comparisonData); // Depuração
    toggleModal(comparisonModal, false, false);
});

// Função para calcular a variação percentual e determinar o ícone
function calculateVariation(currentValue, previousValue) {
    if (!previousValue || previousValue === 0) return { percentage: 0, icon: '' };
    const percentage = ((currentValue - previousValue) / previousValue) * 100;
    const icon = percentage >= 0 ? '⬆️' : '⬇️';
    return { percentage: Math.abs(percentage).toFixed(2), icon };
}

// Geração do relatório com soma consolidada dos itens filtrados ativados
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await generateReport();
});

async function generateReport() {
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
    let comparisonMetrics = null;

    // Calcular métricas para o período principal
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
                    console.log(`Spend para ad set ${adSetId}: ${insights.spend}`);
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
        const response = await new Promise(resolve => {
            FB.api(
                `/${unitId}/insights`,
                { fields: ['spend', 'actions', 'reach'], time_range: { since: startDate, until: endDate }, level: 'account', access_token: currentAccessToken },
                resolve
            );
        });

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
        } else {
            reportContainer.innerHTML = '<p>Nenhum dado encontrado para os filtros aplicados ou erro na requisição.</p>';
            if (response.error) console.error('Erro da API:', response.error);
            shareWhatsAppBtn.style.display = 'none';
            return;
        }
    }

    // Calcular métricas para o período de comparação, se aplicável
    if (comparisonData && comparisonData.startDate && comparisonData.endDate) {
        let compareSpend = 0;
        let compareConversations = 0;
        let compareReach = 0;

        if (isFilterActivated) {
            if (selectedCampaigns.size > 0) {
                for (const campaignId of selectedCampaigns) {
                    const insights = await getCampaignInsights(campaignId, comparisonData.startDate, comparisonData.endDate);
                    if (insights && insights.spend) {
                        compareSpend += parseFloat(insights.spend) || 0;
                    }
                    if (insights && insights.reach) {
                        compareReach += parseInt(insights.reach) || 0;
                    }
                    (insights.actions || []).forEach(action => {
                        if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                            compareConversations += parseInt(action.value) || 0;
                        }
                    });
                }
            } else if (selectedAdSets.size > 0) {
                for (const adSetId of selectedAdSets) {
                    const insights = await getAdSetInsights(adSetId, comparisonData.startDate, comparisonData.endDate);
                    if (insights && insights.spend) {
                        compareSpend += parseFloat(insights.spend) || 0;
                    }
                    if (insights && insights.reach) {
                        compareReach += parseInt(insights.reach) || 0;
                    }
                    (insights.actions || []).forEach(action => {
                        if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                            compareConversations += parseInt(action.value) || 0;
                        }
                    });
                }
            }
        } else {
            const response = await new Promise(resolve => {
                FB.api(
                    `/${unitId}/insights`,
                    { fields: ['spend', 'actions', 'reach'], time_range: { since: comparisonData.startDate, until: comparisonData.endDate }, level: 'account', access_token: currentAccessToken },
                    resolve
                );
            });

            if (response && !response.error && response.data.length > 0) {
                response.data.forEach(data => {
                    if (data.spend) {
                        compareSpend += parseFloat(data.spend) || 0;
                    }
                    if (data.reach) {
                        compareReach += parseInt(data.reach) || 0;
                    }
                    (data.actions || []).forEach(action => {
                        if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                            compareConversations += parseInt(action.value) || 0;
                        }
                    });
                });
            }
        }

        const compareCostPerConversation = compareConversations > 0 ? (compareSpend / compareConversations).toFixed(2) : '0';
        comparisonMetrics = {
            reach: compareReach,
            conversations: compareConversations,
            costPerConversation: parseFloat(compareCostPerConversation)
        };
        console.log('Métricas de comparação calculadas:', comparisonMetrics); // Depuração
    } else {
        console.log('Nenhum período de comparação selecionado ou dados inválidos:', comparisonData); // Depuração
    }

    const costPerConversation = totalConversations > 0 ? (totalSpend / totalConversations).toFixed(2) : '0';

    // Construir o relatório com design bonito
    let reportHTML = `
        <div class="report-header">
            <h2>Relatório Completo - CA - ${unitName}</h2>
            <p>📅 Período: ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}</p>
            ${comparisonData && comparisonData.startDate && comparisonData.endDate ? `<p>📅 Comparação: ${comparisonData.startDate.split('-').reverse().join('/')} a ${comparisonData.endDate.split('-').reverse().join('/')}</p>` : ''}
        </div>
        <div class="metrics-grid">
            <div class="metric-card reach">
                <div>
                    <div class="metric-label">Alcance Total</div>
                    <div class="metric-value">${totalReach.toLocaleString('pt-BR')} pessoas</div>
                    ${comparisonMetrics ? `
                        <div class="metric-comparison ${comparisonMetrics.reach <= totalReach ? 'increase' : 'decrease'}">
                            ${calculateVariation(totalReach, comparisonMetrics.reach).percentage}% ${calculateVariation(totalReach, comparisonMetrics.reach).icon}
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="metric-card messages">
                <div>
                    <div class="metric-label">Mensagens Iniciadas</div>
                    <div class="metric-value">${totalConversations}</div>
                    ${comparisonMetrics ? `
                        <div class="metric-comparison ${comparisonMetrics.conversations <= totalConversations ? 'increase' : 'decrease'}">
                            ${calculateVariation(totalConversations, comparisonMetrics.conversations).percentage}% ${calculateVariation(totalConversations, comparisonMetrics.conversations).icon}
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="metric-card cost">
                <div>
                    <div class="metric-label">Custo por Mensagem</div>
                    <div class="metric-value">R$ ${costPerConversation.replace('.', ',')}</div>
                    ${comparisonMetrics ? `
                        <div class="metric-comparison ${comparisonMetrics.costPerConversation >= parseFloat(costPerConversation) ? 'increase' : 'decrease'}">
                            ${calculateVariation(parseFloat(costPerConversation), comparisonMetrics.costPerConversation).percentage}% ${calculateVariation(parseFloat(costPerConversation), comparisonMetrics.costPerConversation).icon}
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="metric-card investment">
                <div>
                    <div class="metric-label">Investimento Total</div>
                    <div class="metric-value">R$ ${totalSpend.toFixed(2).replace('.', ',')}</div>
                </div>
            </div>
        </div>
    `;

    reportContainer.classList.add('complete');
    reportContainer.innerHTML = reportHTML;
    shareWhatsAppBtn.style.display = 'block';
}

// Compartilhar no WhatsApp
shareWhatsAppBtn.addEventListener('click', () => {
    const reportText = reportContainer.innerText;
    const encodedText = encodeURIComponent(reportText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
});

// Botão Voltar para a tela de seleção de relatório
backBtn.addEventListener('click', () => {
    console.log('Botão Voltar clicado - Retornando para a tela de seleção de relatório no index.html');
    window.location.href = 'index.html';
    // Limpar dados do relatório completo
    reportContainer.innerHTML = '';
    shareWhatsAppBtn.style.display = 'none';
    form.reset();
    selectedCampaigns.clear();
    selectedAdSets.clear();
    isCampaignFilterActive = false;
    isAdSetFilterActive = false;
    isFilterActivated = false;
    filterCampaignsBtn.disabled = false;
    filterAdSetsBtn.disabled = false;
    filterCampaignsBtn.style.cursor = 'pointer';
    filterAdSetsBtn.style.cursor = 'pointer';
    comparisonData = null;
});