import html2canvas from 'html2canvas';

export const generateStatsImage = async (stats: { 
  faltas: number; 
  afastamentos: number; 
  ferias: number; 
  percentual: string 
}) => {
  const container = document.createElement('div');
  container.style.padding = '20px';
  container.style.background = '#fff';
  container.style.width = '400px';
  container.style.borderRadius = '16px';
  container.style.fontFamily = 'sans-serif';
  
  container.innerHTML = `
    <h2 style="color: #2c3e50;">Resumo do Turno</h2>
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <span>Faltas:</span> <strong>${stats.faltas}</strong>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <span>Afastamentos:</span> <strong>${stats.afastamentos}</strong>
    </div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <span>Férias:</span> <strong>${stats.ferias}</strong>
    </div>
    <hr />
    <div style="display: flex; justify-content: space-between; margin-top: 10px; color: #e74c3c;">
      <span>Absenteísmo:</span> <strong>${stats.percentual}</strong>
    </div>
  `;
  document.body.appendChild(container);
  
  const canvas = await html2canvas(container);
  document.body.removeChild(container);
  
  const link = document.createElement('a');
  link.download = 'resumo_turno.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
};
