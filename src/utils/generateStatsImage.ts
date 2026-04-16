import html2canvas from 'html2canvas';

export const generateStatsImage = async (data: { 
  faltas: string[]; 
  afastamentos: string[]; 
  ferias: string[]; 
  percentual: string 
}) => {
  const container = document.createElement('div');
  container.style.padding = '25px';
  container.style.background = 'white';
  container.style.width = '450px';
  container.style.borderRadius = '20px';
  container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
  container.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
  
  const renderList = (title: string, list: string[], color: string) => `
    <div style="margin-bottom: 15px;">
      <h3 style="margin: 0 0 8px 0; color: ${color}; font-size: 14px;">${title} (${list.length})</h3>
      <ul style="margin: 0; padding: 0 0 0 16px; font-size: 12px; color: #555;">
        ${list.map(name => `<li>${name}</li>`).join('') || '<li style="list-style:none;">Nenhum</li>'}
      </ul>
    </div>
  `;
  
  container.innerHTML = `
    <h2 style="color: #1a5276; margin: 0 0 20px 0; border-bottom: 2px solid #1a5276; padding-bottom: 10px;">Relatório Diário</h2>
    ${renderList('Faltas', data.faltas, '#e74c3c')}
    ${renderList('Afastamentos', data.afastamentos, '#f39c12')}
    ${renderList('Férias', data.ferias, '#3498db')}
    <div style="margin-top: 20px; padding: 15px; background: #f8f9f9; border-radius: 10px; display: flex; justify-content: space-between;">
      <span style="font-weight: bold; color: #2c3e50;">Absenteísmo Total:</span>
      <span style="color: #c0392b; font-weight: bold; font-size: 18px;">${data.percentual}</span>
    </div>
  `;
  document.body.appendChild(container);
  
  // Faster render option: use standard scale, avoid high overhead
  const canvas = await html2canvas(container, { scale: 1.5 });
  document.body.removeChild(container);
  
  const link = document.createElement('a');
  link.download = 'resumo_turno_detalhado.png';
  link.href = canvas.toDataURL('image/png', 0.8); // slight quality reduction for speed
  link.click();
};
