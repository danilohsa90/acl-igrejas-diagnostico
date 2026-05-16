// Cole este bloco no seu Apps Script para substituir o visual do PDF privado.
// Substitua buildPdfHtml_ e summaryCardHtml_ e adicione os helpers abaixo.

function buildPdfHtml_(record) {
  const summary = record.executiveSummary || {};
  const tone = pdfTone_(record.riskLabel);
  const dimensions = Array.isArray(record.dimensions) ? record.dimensions : [];
  const rankedDimensions = dimensions
    .filter(function(dimension) {
      return dimension.score !== null && typeof dimension.score !== 'undefined' && !Number.isNaN(Number(dimension.score));
    })
    .slice()
    .sort(function(a, b) {
      return Number(b.score) - Number(a.score);
    });

  const dimensionBarsHtml = rankedDimensions.length
    ? rankedDimensions.map(function(dimension) {
        const score = Number(dimension.score);
        const width = Math.max(8, Math.min(score, 100));
        const color = score <= 30 ? '#2f9e44' : score <= 60 ? '#d08a22' : '#c74235';

        return [
          '<div style="margin:0 0 14px">',
          '<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:6px">',
          '<div style="font-size:13px;font-weight:700;color:#1d2745">', escapeHtml_(dimension.label || 'Dimensão'), '</div>',
          '<div style="font-size:13px;font-weight:700;color:', color, '">', escapeHtml_(score + '%'), '</div>',
          '</div>',
          '<div style="height:10px;border-radius:999px;background:#e9edf5;overflow:hidden">',
          '<div style="height:10px;width:', String(width), '%;border-radius:999px;background:', color, '"></div>',
          '</div>',
          '</div>'
        ].join('');
      }).join('')
    : '<div style="font-size:13px;color:#64748b">Sem dimensões pontuadas para exibir.</div>';

  const priorityQuestions = [];
  dimensions.forEach(function(dimension) {
    (dimension.perguntas || []).forEach(function(question) {
      if (question.resposta === 'n' || question.resposta === 'ns') {
        priorityQuestions.push({
          dimension: dimension.label || 'Dimensão',
          text: question.texto || '',
          action: question.acao || ''
        });
      }
    });
  });

  const priorityCardsHtml = priorityQuestions.length
    ? priorityQuestions.slice(0, 8).map(function(item, index) {
        return [
          '<div style="border:1px solid #eadfca;border-radius:16px;padding:14px 16px;background:#fffdfa;margin:0 0 12px">',
          '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#a98324;margin-bottom:8px">Prioridade ', String(index + 1), ' • ', escapeHtml_(item.dimension), '</div>',
          '<div style="font-size:14px;font-weight:700;color:#1d2745;line-height:1.5;margin-bottom:8px">', escapeHtml_(item.text), '</div>',
          '<div style="font-size:13px;color:#51607a;line-height:1.6"><strong>Ação sugerida:</strong> ', escapeHtml_(item.action || 'Avaliação detalhada da assessoria.'), '</div>',
          '</div>'
        ].join('');
      }).join('')
    : '<div style="font-size:13px;color:#64748b">Nenhuma ação prioritária foi marcada neste envio.</div>';

  const dimensionSectionsHtml = dimensions.map(function(dimension) {
    const scoreLabel = dimension.score === null || dimension.score === '' || typeof dimension.score === 'undefined'
      ? 'N/A'
      : dimension.score + '%';

    const questionsHtml = (dimension.perguntas || []).map(function(question) {
      const answer = mapAnswerLabel_(question.resposta);
      const isPriority = question.resposta === 'n' || question.resposta === 'ns';

      return [
        '<tr>',
        '<td style="padding:10px 12px;border-bottom:1px solid #e9edf5;vertical-align:top;color:#26344f">', escapeHtml_(question.texto || ''), '</td>',
        '<td style="padding:10px 12px;border-bottom:1px solid #e9edf5;vertical-align:top;text-align:center;font-weight:700;color:', isPriority ? '#c74235' : '#1d2745', '">', escapeHtml_(answer), '</td>',
        '<td style="padding:10px 12px;border-bottom:1px solid #e9edf5;vertical-align:top;color:#51607a">', isPriority ? escapeHtml_(question.acao || '') : '-', '</td>',
        '</tr>'
      ].join('');
    }).join('');

    return [
      '<section style="margin:0 0 28px">',
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:10px">',
      '<div>',
      '<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a98324;font-weight:700;margin-bottom:4px">Dimensão</div>',
      '<h3 style="margin:0;font-size:22px;line-height:1.1;color:#1d2745">', escapeHtml_(dimension.label || 'Dimensão'), '</h3>',
      '</div>',
      '<div style="font-size:28px;font-weight:700;color:', tone.accent, '">', escapeHtml_(scoreLabel), '</div>',
      '</div>',
      '<div style="font-size:13px;color:#64748b;line-height:1.7;margin-bottom:12px">', escapeHtml_(dimension.descricao || ''), '</div>',
      '<table style="width:100%;border-collapse:collapse;border:1px solid #e9edf5;border-radius:14px;overflow:hidden;font-size:12px">',
      '<thead>',
      '<tr style="background:#1d2745;color:#ffffff">',
      '<th style="padding:11px 12px;text-align:left">Pergunta</th>',
      '<th style="padding:11px 12px;text-align:center">Resposta</th>',
      '<th style="padding:11px 12px;text-align:left">Ação recomendada</th>',
      '</tr>',
      '</thead>',
      '<tbody>',
      questionsHtml,
      '</tbody>',
      '</table>',
      '</section>'
    ].join('');
  }).join('');

  const topSensitive = Array.isArray(summary.pontosMaisSensveis) && summary.pontosMaisSensveis.length
    ? summary.pontosMaisSensveis.join(' • ')
    : '';

  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="UTF-8">',
    '</head>',
    '<body style="margin:0;padding:0;background:#f4efe3;font-family:Arial,sans-serif;color:#1f2937">',
    '<div style="max-width:980px;margin:0 auto;padding:28px 24px 40px">',
    '<section style="overflow:hidden;border-radius:28px;background:linear-gradient(180deg,#1d2745,#273456);color:#f8f3e8;box-shadow:0 20px 48px rgba(29,39,69,.22);margin-bottom:24px">',
    '<div style="padding:30px 30px 24px">',
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap">',
    '<div>',
    '<div style="display:inline-flex;align-items:center;padding:10px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#e9d8a6;font-size:11px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;margin-bottom:14px">ACL | Relatório Privado</div>',
    '<h1 style="margin:0;font-size:34px;line-height:1.02;color:#fff7df">Diagnóstico Jurídico Preventivo para Igrejas</h1>',
    '<div style="font-size:15px;line-height:1.7;color:#d9e2f4;margin-top:12px;max-width:620px">Relatório interno gerado a partir do formulário de diagnóstico. Este material foi preparado para leitura privada da assessoria.</div>',
    '</div>',
    pdfGauge_(record.overallScore, tone.accent, record.riskLabel),
    '</div>',
    '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:24px">',
    summaryCardHtml_('Igreja', record.churchName || 'Não informado', '#1d2745'),
    summaryCardHtml_('Denominação / ministério', record.denomination || 'Não informado', '#1d2745'),
    summaryCardHtml_('Cidade / estado', record.cityState || 'Não informado', '#1d2745'),
    summaryCardHtml_('Líder responsável', record.leaderName || 'Não informado', '#1d2745'),
    summaryCardHtml_('Plano recomendado', record.planName || 'Não definido', tone.accent),
    summaryCardHtml_('Ações prioritárias', String(record.actionCount || 0), tone.accent),
    '</div>',
    '</div>',
    '</section>',

    '<section style="display:grid;grid-template-columns:1.2fr .8fr;gap:20px;margin-bottom:24px">',
    '<div style="border-radius:24px;background:#fffdfa;border:1px solid #eadfca;padding:22px 22px 18px;box-shadow:0 16px 36px rgba(29,39,69,.08)">',
    '<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a98324;font-weight:700;margin-bottom:8px">Leitura executiva</div>',
    '<div style="font-size:15px;line-height:1.8;color:#33415f">', escapeHtml_(summary.leitura || 'Sem resumo executivo informado.'), '</div>',
    topSensitive ? '<div style="font-size:13px;line-height:1.7;color:#51607a;margin-top:12px"><strong>Pontos mais sensíveis:</strong> ' + escapeHtml_(topSensitive) + '</div>' : '',
    '</div>',
    '<div style="border-radius:24px;background:#fffdfa;border:1px solid #eadfca;padding:22px 22px 18px;box-shadow:0 16px 36px rgba(29,39,69,.08)">',
    '<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a98324;font-weight:700;margin-bottom:10px">Painel de dimensões</div>',
    dimensionBarsHtml,
    '</div>',
    '</section>',

    '<section style="border-radius:24px;background:#fffdfa;border:1px solid #eadfca;padding:22px 22px 12px;box-shadow:0 16px 36px rgba(29,39,69,.08);margin-bottom:24px">',
    '<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a98324;font-weight:700;margin-bottom:12px">Ações prioritárias destacadas</div>',
    priorityCardsHtml,
    '</section>',

    '<section style="border-radius:24px;background:#fffdfa;border:1px solid #eadfca;padding:22px 22px 4px;box-shadow:0 16px 36px rgba(29,39,69,.08)">',
    '<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#a98324;font-weight:700;margin-bottom:16px">Detalhamento por dimensão</div>',
    dimensionSectionsHtml,
    '</section>',

    '</div>',
    '</body>',
    '</html>'
  ].join('');
}

function summaryCardHtml_(label,value,accentColor){
  return '<div style="padding:16px 18px;border-radius:20px;background:#fffdfa;border:1px solid #e5d7b3;box-shadow:0 10px 24px rgba(22,33,62,.06)"><div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8a6a1f;margin-bottom:8px">'+escapeHtml_(label)+'</div><div style="font-size:22px;font-weight:700;line-height:1.2;color:'+(accentColor||'#16213e')+'">'+escapeHtml_(value)+'</div></div>';
}

function pdfTone_(riskLabel){
  if(riskLabel==='Baixo Risco') return {accent:'#38a169',strong:'#2f855a',label:'Baixo risco'};
  if(riskLabel==='Risco Moderado') return {accent:'#d4a017',strong:'#9a6700',label:'Risco moderado'};
  return {accent:'#c2410c',strong:'#9a3412',label:'Risco elevado'};
}

function pdfGauge_(score,color,label){
  var safe=score===null||Number.isNaN(score)?0:Math.max(0,Math.min(100,Number(score)));
  var radius=56; var c=2*Math.PI*radius; var offset=c-(safe/100)*c;
  var txt=score===null||Number.isNaN(score)?'N/A':safe+'%';
  return '<div style="width:220px;padding:18px 16px;border-radius:24px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);text-align:center"><svg width="146" height="146" viewBox="0 0 146 146"><circle cx="73" cy="73" r="56" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="12"></circle><circle cx="73" cy="73" r="56" fill="none" stroke="'+color+'" stroke-width="12" stroke-linecap="round" transform="rotate(-90 73 73)" stroke-dasharray="'+c.toFixed(2)+'" stroke-dashoffset="'+offset.toFixed(2)+'"></circle><text x="73" y="68" text-anchor="middle" font-size="14" fill="rgba(255,255,255,.66)" font-family="Arial">Score</text><text x="73" y="88" text-anchor="middle" font-size="24" font-weight="700" fill="#ffffff" font-family="Arial">'+escapeHtml_(txt)+'</text></svg><div style="margin-top:4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#f0ddb0">'+escapeHtml_(label)+'</div></div>';
}
