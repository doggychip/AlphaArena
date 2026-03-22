/**
 * AlphaArena Leaderboard Widget
 *
 * Usage:
 *   <div id="alphaarena-widget"></div>
 *   <script src="https://alphaarena.zeabur.app/widget.js"></script>
 *   <script>AlphaArena.init({ container: '#alphaarena-widget', limit: 5, theme: 'dark' })</script>
 */
(function() {
  const API = 'https://alphaarena.zeabur.app';

  window.AlphaArena = {
    init: function(opts) {
      const container = document.querySelector(opts.container || '#alphaarena-widget');
      if (!container) { console.error('AlphaArena: container not found'); return; }

      const limit = opts.limit || 5;
      const theme = opts.theme || 'dark';
      const isDark = theme === 'dark';

      container.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Loading AlphaArena...</div>';

      fetch(API + '/api/leaderboard')
        .then(r => r.json())
        .then(data => {
          const agents = (data || []).slice(0, limit);

          const bg = isDark ? '#0a0a0f' : '#ffffff';
          const text = isDark ? '#e4e4e7' : '#18181b';
          const muted = isDark ? '#71717a' : '#a1a1aa';
          const border = isDark ? '#27272a' : '#e4e4e7';
          const accent = '#22d3ee';
          const green = '#34d399';
          const red = '#f87171';

          let html = '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;background:' + bg + ';border:1px solid ' + border + ';border-radius:12px;padding:16px;max-width:400px">';
          html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
          html += '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:14px;font-weight:700;color:' + text + '">AlphaArena</span><span style="font-size:10px;color:' + accent + ';background:' + accent + '15;padding:2px 6px;border-radius:99px;font-weight:600">LIVE</span></div>';
          html += '<a href="' + API + '" target="_blank" style="font-size:11px;color:' + accent + ';text-decoration:none">View All →</a>';
          html += '</div>';

          html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
          html += '<thead><tr style="color:' + muted + ';font-size:10px;text-transform:uppercase;letter-spacing:0.5px">';
          html += '<th style="text-align:left;padding:6px 4px;font-weight:500">#</th>';
          html += '<th style="text-align:left;padding:6px 4px;font-weight:500">Agent</th>';
          html += '<th style="text-align:right;padding:6px 4px;font-weight:500">Return</th>';
          html += '<th style="text-align:right;padding:6px 4px;font-weight:500">Score</th>';
          html += '</tr></thead><tbody>';

          agents.forEach(function(e) {
            var ret = (e.totalReturn * 100).toFixed(1);
            var retColor = e.totalReturn >= 0 ? green : red;
            var rankColor = e.rank <= 3 ? '#fbbf24' : muted;
            html += '<tr style="border-top:1px solid ' + border + '">';
            html += '<td style="padding:8px 4px;font-weight:700;color:' + rankColor + ';font-family:monospace">' + e.rank + '</td>';
            html += '<td style="padding:8px 4px"><a href="' + API + '/#/agents/' + e.agentId + '" target="_blank" style="color:' + text + ';text-decoration:none;font-weight:500">' + (e.agent && e.agent.name || 'Agent') + '</a></td>';
            html += '<td style="padding:8px 4px;text-align:right;font-family:monospace;font-weight:600;color:' + retColor + '">' + (e.totalReturn >= 0 ? '+' : '') + ret + '%</td>';
            html += '<td style="padding:8px 4px;text-align:right;font-family:monospace;color:' + accent + ';font-weight:600">' + (e.compositeScore * 100).toFixed(0) + '</td>';
            html += '</tr>';
          });

          html += '</tbody></table>';
          html += '<div style="text-align:center;margin-top:12px;padding-top:10px;border-top:1px solid ' + border + '">';
          html += '<a href="' + API + '/#/challenge" target="_blank" style="display:inline-block;background:#f59e0b;color:#000;padding:6px 16px;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none">Challenge a Legend →</a>';
          html += '</div></div>';

          container.innerHTML = html;
        })
        .catch(function(err) {
          container.innerHTML = '<div style="padding:20px;text-align:center;color:#f87171;font-size:12px">Failed to load AlphaArena leaderboard</div>';
        });
    }
  };
})();
