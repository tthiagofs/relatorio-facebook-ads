// RelatorioCompleto.js - Módulo para o Relatório Completo

document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const reportSelectionScreen = document.getElementById('reportSelectionScreen');
    const loginScreen = document.getElementById('loginScreen');
    const fullReportScreen = document.getElementById('fullReportScreen');
    const fullReportBtn = document.getElementById('fullReportBtn');
    const backToSelectionBtn = document.getElementById('backToSelectionBtn');
    const fullReportForm = document.getElementById('fullReportForm');
    const loginBtn = document.getElementById('loginBtn');
    const filterWhiteCampaignsBtn = document.getElementById('filterWhiteCampaigns');
    const filterBlackCampaignsBtn = document.getElementById('filterBlackCampaigns');
    const whiteCampaignsModal = document.getElementById('whiteCampaignsModal');
    const blackCampaignsModal = document.getElementById('blackCampaignsModal');
    const closeWhiteCampaignsModalBtn = document.getElementById('closeWhiteCampaignsModal');
    const closeBlackCampaignsModalBtn = document.getElementById('closeBlackCampaignsModal');

    // Verificação para garantir que os elementos foram encontrados
    if (!reportSelectionScreen || !loginScreen || !fullReportScreen || !fullReportBtn || !backToSelectionBtn || !fullReportForm || !loginBtn || !filterWhiteCampaignsBtn || !filterBlackCampaignsBtn || !whiteCampaignsModal || !blackCampaignsModal || !closeWhiteCampaignsModalBtn || !closeBlackCampaignsModalBtn) {
        console.error('Um ou mais elementos não foram encontrados no DOM:', {
            reportSelectionScreen: !!reportSelectionScreen,
            loginScreen: !!loginScreen,
            fullReportScreen: !!fullReportScreen,
            fullReportBtn: !!fullReportBtn,
            backToSelectionBtn: !!backToSelectionBtn,
            fullReportForm: !!fullReportForm,
            loginBtn: !!loginBtn,
            filterWhiteCampaignsBtn: !!filterWhiteCampaignsBtn,
            filterBlackCampaignsBtn: !!filterBlackCampaignsBtn,
            whiteCampaignsModal: !!whiteCampaignsModal,
            blackCampaignsModal: !!blackCampaignsModal,
            closeWhiteCampaignsModalBtn: !!closeWhiteCampaignsModalBtn,
            closeBlackCampaignsModalBtn: !!closeBlackCampaignsModalBtn
        });
        return;
    }

    // Mapa para armazenar as unidades e campanhas
    const adAccountsMap = {};
    const campaignsMap = {}; // Mapa para armazenar IDs, nomes e insights das campanhas
    let selectedWhiteCampaigns = new Set(); // Conjunto para armazenar campanhas White selecionadas
    let selectedBlackCampaigns = new Set(); // Conjunto para armazenar campanhas Black selecionadas
    let isWhiteCampaignFilterActive = false;
    let isBlackCampaignFilterActive = false;
    let isFilterActivated = false;

    // Função para alternar telas
    function showScreen(screen) {
        console.log('Alternando para a tela:', screen.id); // Log para depuração
        reportSelectionScreen.style.display = 'none';
        loginScreen.style.display = 'none';
        fullReportScreen.style.display = 'none';
        screen.style.display = 'block';
    }

    // Função para mostrar/esconder modais e gerenciar estado
    function toggleModal(modal, show, isWhite) {
        if (show && isFilterActivated && ((isWhite && selectedWhiteCampaigns.size === 0) || (!isWhite && selectedBlackCampaigns.size === 0))) {
            return; // Impede abrir o modal se os filtros já estiverem ativados sem seleções
        }

        modal.style.display = show ? 'block' : 'none';
        if (show) {
            if (isWhite) {
                isWhiteCampaignFilterActive = true;
                isBlackCampaignFilterActive = false;
                filterBlackCampaignsBtn.disabled = isFilterActivated;
                filterBlackCampaignsBtn.style.cursor = isFilterActivated ? 'not-allowed' : 'pointer';
            } else {
                isBlackCampaignFilterActive = true;
                isWhiteCampaignFilterActive = false;
                filterWhiteCampaignsBtn.disabled = isFilterActivated;
                filterWhiteCampaignsBtn.style.cursor = isFilterActivated ? 'not-allowed' : 'pointer';
            }
        } else {
            if (isWhite) {
                isWhiteCampaignFilterActive = false;
                if (isFilterActivated && selectedWhiteCampaigns.size === 0) {
                    isFilterActivated = false;
                    filterBlackCampaignsBtn.disabled = false;
                    filterBlackCampaignsBtn.style.cursor = 'pointer';
                } else {
                    filterBlackCampaignsBtn.disabled = isFilterActivated && selectedWhiteCampaigns.size > 0;
                    filterBlackCampaignsBtn.style.cursor = isFilterActivated && selectedWhiteCampaigns.size > 0 ? 'not-allowed' : 'pointer';
                }
            } else {
                isBlackCampaignFilterActive = false;
                if (isFilterActivated && selectedBlackCampaigns.size === 0) {
                    isFilterActivated = false;
                    filterWhiteCampaignsBtn.disabled = false;
                    filterWhiteCampaignsBtn.style.cursor = 'pointer';
                } else {
                    filterWhiteCampaignsBtn.disabled = isFilterActivated && selectedBlackCampaigns.size > 0;
                    filterWhiteCampaignsBtn.style.cursor = isFilterActivated && selectedBlackCampaigns.size > 0 ? 'not-allowed' : 'pointer';
                }
            }
        }
        updateFilterButton(isWhite ? 'white' : 'black');
    }

    // Função para atualizar o botão de ativação/desativação nos modais
    function updateFilterButton(type) {
        const modal = type === 'white' ? whiteCampaignsModal : blackCampaignsModal;
        const campaignsButton = modal.querySelector('.btn-filter-toggle');

        if (campaignsButton) {
            campaignsButton.textContent = isFilterActivated && (type === 'white' ? selectedWhiteCampaigns.size > 0 : selectedBlackCampaigns.size > 0) ? 'Desativar Seleção' : 'Ativar Seleções';
            campaignsButton.disabled = !isFilterActivated && (type === 'white' ? selectedWhiteCampaigns.size === 0 : selectedBlackCampaigns.size === 0);
        }

        filterWhiteCampaignsBtn.disabled = isFilterActivated && (selectedBlackCampaigns.size > 0 || (selectedWhiteCampaigns.size === 0 && !isWhiteCampaignFilterActive));
        filterBlackCampaignsBtn.disabled = isFilterActivated && (selectedWhiteCampaigns.size > 0 || (selectedBlackCampaigns.size === 0 && !isBlackCampaignFilterActive));
        filterWhiteCampaignsBtn.style.cursor = filterWhiteCampaignsBtn.disabled ? 'not-allowed' : 'pointer';
        filterBlackCampaignsBtn.style.cursor = filterBlackCampaignsBtn.disabled ? 'not-allowed' : 'pointer';
    }

    // Função para renderizar opções de campanhas nos modals
    function renderOptions(containerId, options, selectedSet, type) {
        const container = document.getElementById(containerId);
        const searchInput = document.getElementById(type === 'white' ? 'whiteCampaignSearch' : 'blackCampaignSearch');
        container.innerHTML = options.length === 0 ? '<p>Buscando...</p>' : '';

        if (options.length > 0) {
            function filterOptions(searchText) {
                const filteredOptions = options.filter(option =>
                    option.label.toLowerCase().includes(searchText.toLowerCase())
                );
                renderFilteredOptions(filteredOptions);
            }

            function renderFilteredOptions(filteredOptions) {
                container.innerHTML = '';
                filteredOptions.forEach(option => {
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
                        if (selectedSet.size === 0 && isFilterActivated) {
                            isFilterActivated = false;
                            if (type === 'white') {
                                isWhiteCampaignFilterActive = false;
                                filterBlackCampaignsBtn.disabled = false;
                                filterBlackCampaignsBtn.style.cursor = 'pointer';
                            } else {
                                isBlackCampaignFilterActive = false;
                                filterWhiteCampaignsBtn.disabled = false;
                                filterWhiteCampaignsBtn.style.cursor = 'pointer';
                            }
                        }
                        updateFilterButton(type);
                    });
                    container.appendChild(div);
                });

                const existingButton = container.querySelector('.btn-filter-toggle');
                if (existingButton) existingButton.remove();

                const filterButton = document.createElement('button');
                filterButton.textContent = isFilterActivated && (type === 'white' ? selectedWhiteCampaigns.size > 0 : selectedBlackCampaigns.size > 0) ? 'Desativar Seleção' : 'Ativar Seleções';
                filterButton.className = 'btn-filter-toggle';
                filterButton.disabled = (type === 'white' ? selectedWhiteCampaigns.size === 0 : selectedBlackCampaigns.size === 0);
                filterButton.addEventListener('click', () => {
                    if (isFilterActivated && (type === 'white' ? selectedWhiteCampaigns.size > 0 : selectedBlackCampaigns.size > 0)) {
                        isFilterActivated = false;
                        if (type === 'white') {
                            selectedWhiteCampaigns.clear();
                            isWhiteCampaignFilterActive = false;
                        } else {
                            selectedBlackCampaigns.clear();
                            isBlackCampaignFilterActive = false;
                        }
                        filterWhiteCampaignsBtn.disabled = false;
                        filterBlackCampaignsBtn.disabled = false;
                        filterWhiteCampaignsBtn.style.cursor = 'pointer';
                        filterBlackCampaignsBtn.style.cursor = 'pointer';
                    } else if (type === 'white' ? selectedWhiteCampaigns.size > 0 : selectedBlackCampaigns.size > 0) {
                        isFilterActivated = true;
                        if (type === 'white') {
                            isWhiteCampaignFilterActive = true;
                            isBlackCampaignFilterActive = false;
                            filterBlackCampaignsBtn.disabled = true;
                            filterBlackCampaignsBtn.style.cursor = 'not-allowed';
                        } else {
                            isBlackCampaignFilterActive = true;
                            isWhiteCampaignFilterActive = false;
                            filterWhiteCampaignsBtn.disabled = true;
                            filterWhiteCampaignsBtn.style.cursor = 'not-allowed';
                        }
                    }
                    renderFilteredOptions(filteredOptions);
                    updateFilterButton(type);
                });
                container.appendChild(filterButton);
            }

            renderFilteredOptions(options);

            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    filterOptions(e.target.value);
                });
            }
        }
    }

    // Função para carregar campanhas
    async function loadCampaigns(unitId, startDate, endDate) {
        return new Promise((resolve) => {
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
                        if (!isBlackCampaignFilterActive && !isWhiteCampaignFilterActive) {
                            const campaignOptions = campaignIds.map(id => ({
                                value: id,
                                label: campaignsMap[unitId][id].name,
                                spend: campaignsMap[unitId][id].insights.spend
                            }));
                            renderOptions('whiteCampaignsList', campaignOptions, selectedWhiteCampaigns, 'white');
                            renderOptions('blackCampaignsList', campaignOptions, selectedBlackCampaigns, 'black');
                        }
                        resolve();
                    } else {
                        console.error('Erro ao carregar campanhas:', campaignResponse.error);
                        resolve();
                    }
                }
            );
        });
    }

    // Função para obter insights das campanhas
    async function getCampaignInsights(campaignId, startDate, endDate) {
        return new Promise((resolve) => {
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

    // Evento para o botão "Relatório Completo"
    fullReportBtn.addEventListener('click', () => {
        console.log('Botão Relatório Completo clicado');
        showScreen(loginScreen);
    });

    // Evento para o botão "Voltar ao Início"
    backToSelectionBtn.addEventListener('click', () => {
        console.log('Botão Voltar ao Início clicado');
        showScreen(reportSelectionScreen);
    });

    // Login com Facebook e carregamento das unidades
    loginBtn.addEventListener('click', () => {
        FB.login(function(response) {
            if (response.authResponse) {
                showScreen(fullReportScreen);
                FB.api('/me/adaccounts', { fields: 'id,name' }, function(accountResponse) {
                    if (accountResponse && !accountResponse.error) {
                        const unitSelect = document.getElementById('fullUnitId');
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

    // Carrega as campanhas quando o formulário é preenchido
    fullReportForm.addEventListener('input', async function(e) {
        const unitId = document.getElementById('fullUnitId').value;
        const startDate = document.getElementById('fullStartDate').value;
        const endDate = document.getElementById('fullEndDate').value;

        if (unitId && startDate && endDate) {
            campaignsMap[unitId] = {};
            selectedWhiteCampaigns.clear();
            selectedBlackCampaigns.clear();
            isWhiteCampaignFilterActive = false;
            isBlackCampaignFilterActive = false;
            isFilterActivated = false;
            filterWhiteCampaignsBtn.disabled = false;
            filterBlackCampaignsBtn.disabled = false;
            filterWhiteCampaignsBtn.style.cursor = 'pointer';
            filterBlackCampaignsBtn.style.cursor = 'pointer';
            await loadCampaigns(unitId, startDate, endDate);
        }
    });

    // Configurar eventos para os botões de filtro
    filterWhiteCampaignsBtn.addEventListener('click', () => {
        if (isFilterActivated && selectedBlackCampaigns.size > 0) return;
        isWhiteCampaignFilterActive = true;
        toggleModal(whiteCampaignsModal, true, true);
    });

    filterBlackCampaignsBtn.addEventListener('click', () => {
        if (isFilterActivated && selectedWhiteCampaigns.size > 0) return;
        isBlackCampaignFilterActive = true;
        toggleModal(blackCampaignsModal, true, false);
    });

    closeWhiteCampaignsModalBtn.addEventListener('click', () => {
        isWhiteCampaignFilterActive = false;
        toggleModal(whiteCampaignsModal, false, true);
        updateFilterButton('white');
    });

    closeBlackCampaignsModalBtn.addEventListener('click', () => {
        isBlackCampaignFilterActive = false;
        toggleModal(blackCampaignsModal, false, false);
        updateFilterButton('black');
    });

    // Evento de submissão do formulário (a ser implementado na próxima etapa)
    fullReportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Formulário do Relatório Completo submetido');
        console.log('Campanhas White selecionadas:', Array.from(selectedWhiteCampaigns));
        console.log('Campanhas Black selecionadas:', Array.from(selectedBlackCampaigns));
        // A lógica de geração do relatório será implementada na próxima etapa
    });

    console.log('RelatorioCompleto.js carregado com sucesso');
});