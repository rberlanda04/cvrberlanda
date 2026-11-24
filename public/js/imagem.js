// Converte a imagem escolhida em um "data URL" pequeno (redimensionado e
// comprimido no próprio navegador) para gravar direto no Firestore.
//
// Por quê: o Firebase Storage do projeto exige a conta de cobrança ativa
// (plano Blaze). Sem ela, todo arquivo do Storage responde "402 Payment
// Required" e as logos somem do currículo. Guardando a imagem no próprio
// documento do Firestore, o site não depende mais do Storage.
// Limite do Firestore: 1 MB por documento, por isso o teto de bytes.

function carregarImagem(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não consegui ler essa imagem. Tente um JPG ou PNG."));
    };
    img.src = url;
  });
}

function tamanhoDataUrl(dataUrl) {
  return dataUrl.length; // é o que conta no limite do documento
}

/**
 * @param {File} file imagem escolhida
 * @param {number} maxLado maior lado final, em px (ex.: 256 para logo)
 * @param {number} maxBytes tamanho máximo do data URL (ex.: 150000)
 * @returns {Promise<string>} data URL (image/webp ou image/jpeg)
 */
export async function imagemParaDataUrl(file, maxLado, maxBytes) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Escolha uma imagem (JPG, PNG ou WebP).");
  }
  const img = await carregarImagem(file);
  let lado = maxLado;
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * escala));
    const h = Math.max(1, Math.round(img.naturalHeight * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    for (const qualidade of [0.9, 0.8, 0.7, 0.6]) {
      // WebP mantém a transparência das logos; navegadores sem WebP caem no JPEG.
      let dataUrl = canvas.toDataURL("image/webp", qualidade);
      if (!dataUrl.startsWith("data:image/webp")) dataUrl = canvas.toDataURL("image/jpeg", qualidade);
      if (tamanhoDataUrl(dataUrl) <= maxBytes) return dataUrl;
    }
    lado = Math.round(lado * 0.75);
  }
  throw new Error("A imagem ficou grande demais mesmo comprimida. Tente outra.");
}
