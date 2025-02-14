// Código corrigido para exibir criativos corretamente (imagens e vídeos) e manter o relatório visível
let accessToken = '';  
let adAccountsMap = {};  

function loginWithFacebook() {
    FB.login(function(response) {
        if (response.authResponse) {
            accessToken = response.authResponse.accessToken;
            fetchAdAccounts();
            document.getElementById('form').style.display = 'block';
            document.getElementById('loginBtn').style.display = 'none';
        } else {
            alert('Falha no login com o Facebook');
        }
    }, { scope: 'ads_read,ads_management' });
}

function fetchAdAccounts() {
    const url = `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name&access_token=${accessToken}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.data) {
                const unitSelect = document.getElementById('unitId');
                unitSelect.innerHTML = '<option value="">Escolha a unidade</option>';
                data.data.forEach(account => {
                    adAccountsMap[account.id] = account.name;
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = account.name;
                    unitSelect.appendChild(option);
                });
            }
        })
        .catch(error => console.error('Erro ao buscar contas de anúncios:', error));
}

function fetchCampaignData(unitId) {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const url = `https://graph.facebook.com/v18.0/${unitId}/insights?fields=campaign_name,spend,reach,actions,ad_id&access_token=${accessToken}&time_range=${encodeURIComponent(JSON.stringify({since: startDate, until: endDate}))}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (!data.data || data.data.length === 0) {
                generateReport({ unitName: adAccountsMap[unitId] || unitId, startDate, endDate, campaignName: 'Sem dados', spent: '0,00', messages: '0', cpc: '0,00', reach: '0' });
                return;
            }
            const campaignData = data.data[0];
            const actions = campaignData.actions || [];
            const messages = actions.find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || 0;
            const spent = parseFloat(campaignData.spend) || 0;
            const cpc = messages > 0 ? (spent / messages) : 0;

            const reportData = {
                unitName: adAccountsMap[unitId] || unitId,
                startDate,
                endDate,
                campaignName: campaignData.campaign_name || 'Campanha Desconhecida',
                spent: spent.toFixed(2).replace('.', ','),
                messages: messages.toLocaleString('pt-BR'),
                cpc: cpc.toFixed(2).replace('.', ','),
                reach: parseInt(campaignData.reach || 0).toLocaleString('pt-BR'),
                unitId
            };
            generateReport(reportData);
        })
        .catch(error => console.error('Erro ao buscar dados:', error));
}

function generateReport(data) {
    const reportContainer = document.getElementById('reportContainer');
    reportContainer.style.overflow = 'visible';
    reportContainer.innerHTML = `
        <h2>📊 RELATÓRIO - ${data.unitName}</h2>
        <p><strong>Período analisado:</strong> ${data.startDate} a ${data.endDate}</p>
        <p><strong>Campanha:</strong> ${data.campaignName}</p>
        <p>💰 <strong>Investimento:</strong> R$ ${data.spent}</p>
        <p>💬 <strong>Mensagens iniciadas:</strong> ${data.messages}</p>
        <p>💵 <strong>Custo por mensagem:</strong> R$ ${data.cpc}</p>
        <p>📢 <strong>Alcance:</strong> ${data.reach} pessoas</p>
        <h3>🎨 Principais Criativos</h3>
        <div id="creativesContainer" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top:20px;"></div>
    `;
    fetchTopCreatives(data.unitId);
}

function fetchTopCreatives(unitId) {
    const url = `https://graph.facebook.com/v18.0/${unitId}/ads?fields=id,name,creative{thumbnail_url,image_url,video_url}&access_token=${accessToken}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const creativesContainer = document.getElementById('creativesContainer');
            creativesContainer.innerHTML = data.data.map(ad => {
                const preview = ad.creative.video_url ?
                    `<video src="${ad.creative.video_url}" controls style="width:100%; max-width:250px; height:auto; border-radius:8px;"></video>` :
                    `<img src="${ad.creative.image_url || ad.creative.thumbnail_url}" alt="Criativo ${ad.name}" style="width:100%; max-width:250px; height:auto; object-fit:cover; border:1px solid #ddd; border-radius:8px;">`;
                return `
                    <div>
                        <p>${ad.name}</p>
                        ${preview}
                    </div>`;
            }).join('');
        })
        .catch(error => console.error('Erro ao buscar criativos:', error));
}

document.getElementById('form').addEventListener('submit', function(event) {
    event.preventDefault();
    const unitId = document.getElementById('unitId').value;
    if (unitId) fetchCampaignData(unitId);
});
