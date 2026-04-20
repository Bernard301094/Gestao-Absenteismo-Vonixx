import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Utilitário inteligente que lida com a exportação de PDF
 * garantindo que funcione perfeitamente no PC (download)
 * e no Celular via Capacitor (Share native module).
 */
export const downloadOrSharePDF = async (doc: any, fileName: string) => {
  if (Capacitor.isNativePlatform()) {
    try {
      // No celular, geramos a string base64 do PDF
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      // Salvamos temporariamente no diretório de Cache
      const result = await Filesystem.writeFile({
        path: fileName,
        data: pdfBase64,
        directory: Directory.Cache,
      });

      // Abrimos a gaveta nativa de compartilhamento/salvamento do Android/iOS
      await Share.share({
        title: fileName,
        url: result.uri,
        dialogTitle: 'Salvar ou Compartilhar PDF',
      });
    } catch (e) {
      console.error('Erro ao compartilhar PDF:', e);
      // Fallback em caso de falha do plugin
      doc.save(fileName);
    }
  } else {
    // No PC, o download silencioso funciona perfeitamente
    doc.save(fileName);
  }
};
