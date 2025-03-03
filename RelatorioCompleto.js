document.addEventListener('DOMContentLoaded', () => {
    console.log('RelatorioCompleto.js carregado com sucesso - Versão Atualizada (03/03/2025)');

    // Elementos DOM
    const reportSelectionScreen = document.getElementById('reportSelectionScreen');
    const loginScreen = document.getElementById('loginScreen');
    const fullReportScreen = document.getElementById('fullReportScreen');
    const fullReportBtn = document.getElementById('fullReportBtn');
    const backToSelectionBtn = document.getElementById('backToSelectionBtn');
    const fullReportForm = document.getElementById('fullReportForm');
    const loginBtn = document.getElementById('loginBtn');
    const reportTypeSelect = document.getElementById('reportType');
    const whiteCampaignLabel = document.getElementById('whiteCampaignLabel');
    const filterWhiteCampaignsBtn = document.getElementById('filterWhiteCampaigns');
    const blackCampaignLabel = document.getElementById('blackCampaignLabel');
    const filterBlackCampaignsBtn = document.getElementById('filterBlackCampaigns');
    const whiteCampaignsModal = document.getElementById('whiteCampaignsModal');
    const blackCampaignsModal = document.getElementById('blackCampaignsModal');
    const closeWhiteCampaignsModalBtn = document.getElementById('closeWhiteCampaignsModal');
    const closeBlackCampaignsModalBtn = document.getElementById('closeBlackCampaignsModal');
    const quantityModal = document.getElementById('quantityModal');
    const closeQuantityModalBtn = document.getElementById('closeQuantityModal');
    const fullReportContainer = document.getElementById('fullReportContainer');

    // Verificação dos elementos
    if (
        !reportSelectionScreen || !loginScreen || !fullReportScreen || !fullReportBtn || 
        !backToSelectionBtn || !fullReportForm || !loginBtn || !reportTypeSelect || 
        !whiteCampaignLabel || !filterWhiteCampaignsBtn || !blackCampaignLabel || 
        !filterBlackCampaignsBtn || !whiteCampaignsModal || !blackCampaignsModal || 
        !closeWhiteCampaignsModalBtn || !closeBlackCampaignsModalBtn || !quantityModal || 
        !closeQuantityModalBtn || !fullReportContainer
    ) {
        console.error('Um ou mais elementos não foram encontrados no DOM');
        return;
    }

    // Mapa para armazenar as unidades e campanhas
    const adAccountsMap = {};
    const campaignsMap = {};
    let selectedWhiteCampaigns = new Set();
    let selectedBlackCampaigns = new Set();
    let isWhiteCampaignFilterActive = false;
    let isBlackCampaignFilterActive = false;
    let isFilterActivated = false;

    // Função para alternar telas
    function showScreen(screen) {
        console.log('Alternando para a tela:', screen.id);
        reportSelectionScreen.style.display = 'none';
        loginScreen.style.display = 'none';
        fullReportScreen.style.display = 'none';
        screen.style.display = 'block';
    }

    // Função para mostrar/esconder modais
    function toggleModal(modal, show, isWhite = null) {
        if (isWhite !== null && show && isFilterActivated && 
            ((isWhite && selectedWhiteCampaigns.size === 0) || (!isWhite && selectedBlackCampaigns.size === 0))) {
            return;
        }

        modal.style.display = show ? 'block' : 'none';
        if (isWhite !== null) {
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
                    }
                } else {
                    isBlackCampaignFilterActive = false;
                    if (isFilterActivated && selectedBlackCampaigns.size === 0) {
                        isFilterActivated = false;
                        filterWhiteCampaignsBtn.disabled = false;
                        filterWhiteCampaignsBtn.style.cursor = 'pointer';
                    }
                }
                updateFilterButton(isWhite ? 'white' : 'black');
            }
        }
    }

    // Função para atualizar o botão de ativação/desativação nos modals
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

    // Função para atualizar a visibilidade dos botões de seleção de campanhas
    function updateCampaignSelectionVisibility() {
        const reportType = reportTypeSelect.value;
        if (!reportType) {
            whiteCampaignLabel.style.display = 'none';
            filterWhiteCampaignsBtn.style.display = 'none';
            blackCampaignLabel.style.display = 'none';
            filterBlackCampaignsBtn.style.display = 'none';
        } else if (reportType === 'white') {
            whiteCampaignLabel.style.display = 'block';
            filterWhiteCampaignsBtn.style.display = 'block';
            blackCampaignLabel.style.display = 'none';
            filterBlackCampaignsBtn.style.display = 'none';
        } else if (reportType === 'black') {
            whiteCampaignLabel.style.display = 'none';
            filterWhiteCampaignsBtn.style.display = 'none';
            blackCampaignLabel.style.display = 'block';
            filterBlackCampaignsBtn.style.display = 'block';
        } else if (reportType === 'whiteAndBlack') {
            whiteCampaignLabel.style.display = 'block';
            filterWhiteCampaignsBtn.style.display = 'block';
            blackCampaignLabel.style.display = 'block';
            filterBlackCampaignsBtn.style.display = 'block';
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

    // Função para gerar os relatórios completos
    window.generateFullReports = async function(quantity) {
        const unitId = document.getElementById('fullUnitId').value;
        const unitName = adAccountsMap[unitId] || 'Unidade Desconhecida';
        const startDate = document.getElementById('fullStartDate').value;
        const endDate = document.getElementById('fullEndDate').value;
        const reportType = reportTypeSelect.value;

        if (!unitId || !startDate || !endDate || !reportType) {
            fullReportContainer.innerHTML = '<p>Preencha todos os campos obrigatórios.</p>';
            return;
        }

        toggleModal(quantityModal, false);

        let whiteData = { spend: 0, conversations: 0, reach: 0 };
        let blackData = { spend: 0, conversations: 0, reach: 0 };

        if (isFilterActivated) {
            if (reportType === 'white' || reportType === 'whiteAndBlack') {
                for (const campaignId of selectedWhiteCampaigns) {
                    const insights = await getCampaignInsights(campaignId, startDate, endDate);
                    whiteData.spend += parseFloat(insights.spend || 0);
                    whiteData.reach += parseInt(insights.reach || 0);
                    (insights.actions || []).forEach(action => {
                        if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                            whiteData.conversations += parseInt(action.value) || 0;
                        }
                    });
                }
            }
            if (reportType === 'black' || reportType === 'whiteAndBlack') {
                for (const campaignId of selectedBlackCampaigns) {
                    const insights = await getCampaignInsights(campaignId, startDate, endDate);
                    blackData.spend += parseFloat(insights.spend || 0);
                    blackData.reach += parseInt(insights.reach || 0);
                    (insights.actions || []).forEach(action => {
                        if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                            blackData.conversations += parseInt(action.value) || 0;
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
                            if (reportType === 'white' || reportType === 'whiteAndBlack') {
                                whiteData.spend += parseFloat(data.spend || 0);
                                whiteData.reach += parseInt(data.reach || 0);
                                (data.actions || []).forEach(action => {
                                    if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                                        whiteData.conversations += parseInt(action.value) || 0;
                                    }
                                });
                            }
                            if (reportType === 'black' || reportType === 'whiteAndBlack') {
                                blackData.spend += parseFloat(data.spend || 0);
                                blackData.reach += parseInt(data.reach || 0);
                                (data.actions || []).forEach(action => {
                                    if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d') {
                                        blackData.conversations += parseInt(action.value) || 0;
                                    }
                                });
                            }
                        });
                    }
                }
            );
        }

        const reportHTML = generateReportHTML(unitName, startDate, endDate, whiteData, blackData, reportType, quantity);
        fullReportContainer.innerHTML = reportHTML;
    };

    // Função para gerar o HTML do relatório com layout específico
    function generateReportHTML(unitName, startDate, endDate, whiteData, blackData, reportType, quantity) {
        const period = `${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}`;
        let html = `<div class="report-layout ${quantity === 2 ? 'two-reports' : quantity === 3 ? 'three-reports' : ''}">`;

        const generateReportItem = (title, data) => {
            const costPerConversation = data.conversations > 0 ? (data.spend / data.conversations).toFixed(2) : '0';
            return `
                <div class="report-item">
                    <p>📊 ${title} - CA - ${unitName}</p>
                    <p>📅 Período: ${period}</p>
                    <p>💰 Investimento Total: R$ ${data.spend.toFixed(2).replace('.', ',')}</p>
                    <p>💬 Mensagens Iniciadas: ${data.conversations}</p>
                    <p>💵 Custo por Mensagem: R$ ${costPerConversation.replace('.', ',')}</p>
                    <p>📢 Alcance Total: ${data.reach.toLocaleString('pt-BR')} pessoas</p>
                </div>
            `;
        };

        if (quantity === 1) {
            if (reportType === 'white') {
                html += generateReportItem('RELATÓRIO WHITE', whiteData);
            } else if (reportType === 'black') {
                html += generateReportItem('RELATÓRIO BLACK', blackData);
            } else {
                html += generateReportItem('RELATÓRIO CONSOLIDADO', {
                    spend: whiteData.spend + blackData.spend,
                    conversations: whiteData.conversations + blackData.conversations,
                    reach: whiteData.reach + blackData.reach
                });
            }
        } else if (quantity === 2) {
            html += generateReportItem('RELATÓRIO WHITE', whiteData);
            html += generateReportItem('RELATÓRIO BLACK', blackData);
        } else if (quantity === 3) {
            html += '<div class="top-row">';
            html += generateReportItem('RELATÓRIO WHITE', whiteData);
            html += generateReportItem('RELATÓRIO BLACK', blackData);
            html += '</div>';
            html += '<div class="bottom-row">';
            html += generateReportItem('RELATÓRIO CONSOLIDADO', {
                spend: whiteData.spend + blackData.spend,
                conversations: whiteData.conversations + blackData.conversations,
                reach: whiteData.reach + blackData.reach
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    // Eventos
    fullReportBtn.addEventListener('click', () => {
        console.log('Botão Relatório Completo clicado');
        showScreen(loginScreen);
    });

    backToSelectionBtn.addEventListener('click', () => {
        console.log('Botão Voltar ao Início clicado');
        showScreen(reportSelectionScreen);
    });

    loginBtn.addEventListener('click', () => {
        FB.login(function(response) {
            if (response.authResponse) {
                console.log('Login com Facebook bem-sucedido:', response.authResponse);
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
                console.error('Falha no login com Facebook:', response);
                document.getElementById('loginError').textContent = 'Login cancelado ou falhou.';
                document.getElementById('loginError').style.display = 'block';
            }
        }, {scope: 'ads_read'});
    });

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
        updateCampaignSelectionVisibility();
    });

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

    fullReportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Formulário do Relatório Completo submetido');
        toggleModal(quantityModal, true);
    });

    closeQuantityModalBtn.addEventListener('click', () => {
        toggleModal(quantityModal, false);
    });

    console.log('RelatorioCompleto.js inicializado');
});