// Thống kê đơn hàng Shopee → tải về báo cáo HTML (Bootstrap 5, có bộ lọc)
// Cách dùng: đăng nhập shopee.vn → F12 → Console → dán toàn bộ file này → Enter
(async () => {
  const LIST_TYPE = 3;  // 3 = Hoàn thành. Thử 0 = Tất cả, 4 = Đã huỷ
  const LIMIT = 20, BATCH = 5;  // tải song song 5 trang mỗi lượt
  const t0 = Date.now();

  // ===== 1) TẢI DỮ LIỆU =====
  const page = off => fetch(`/api/v4/order/get_order_list?list_type=${LIST_TYPE}&offset=${off}&limit=${LIMIT}`)
    .then(r => r.json()).then(j => j?.data?.details_list || []).catch(() => []);

  const raw = [];
  for (let off = 0, done = false; !done; off += LIMIT * BATCH) {
    const pages = await Promise.all([...Array(BATCH)].map((_, i) => page(off + i * LIMIT)));
    for (const p of pages) { raw.push(...p); if (p.length < LIMIT) { done = true; break; } }
    console.log(`⏳ ${raw.length} đơn...`);
  }
  if (!raw.length) return console.warn('Không lấy được đơn nào — kiểm tra đăng nhập shopee.vn');

  // ===== 2) CHUẨN HOÁ =====
  const orders = raw.map(o => {
    const c = o.info_card || {}, cards = c.order_list_cards || [];
    const items = cards.flatMap(lc => (lc.product_info?.item_groups || []).flatMap(g => g.items || []))
      .map(it => ({ name: it.name || '', model: it.model_name || '', qty: it.amount || 0, price: (it.order_price || 0) / 1e5 }));
    const ts = cards[0]?.order_create_time || o.shipping?.tracking_info?.ctime || o.ctime || 0;
    const total = (c.final_total || 0) / 1e5, goc = items.reduce((s, i) => s + i.price, 0);
    return {
      id: String(c.order_id || o.order_id || ''), ts, total, goc, save: Math.max(0, goc - total),
      shop: cards[0]?.shop_info?.shop_name || '(không rõ)',
      status: o.status?.status_label?.text || '', qty: items.reduce((s, i) => s + i.qty, 0), items,
    };
  });

  const sum = k => orders.reduce((s, o) => s + o[k], 0);
  const vnd = n => Math.round(n).toLocaleString('vi-VN') + ' ₫';
  console.log('%c📊 Shopee', 'font-size:18px;color:#ee4d2d;font-weight:bold');
  console.table({
    'Đơn hàng': orders.length, 'Sản phẩm': sum('qty'),
    'Đã chi': vnd(sum('total')), 'Tiết kiệm': vnd(sum('save')),
  });

  // ===== 3) ỨNG DỤNG TRONG FILE HTML (chạy trong file tải về) =====
  function app(DATA) {
    const $ = s => document.querySelector(s);
    const vnd = n => Math.round(n).toLocaleString('vi-VN') + ' ₫';
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const d = o => o.ts ? new Date(o.ts * 1000) : null;
    let sortKey = 'ts', sortDir = -1, view = DATA;

    const fill = (sel, vals) => $(sel).insertAdjacentHTML('beforeend', vals.map(v => `<option>${esc(v)}</option>`).join(''));
    const count = k => Object.entries(DATA.reduce((m, o) => (m[o[k]] = (m[o[k]] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).map(x => x[0]);
    fill('#fShop', count('shop'));
    fill('#fStatus', count('status').filter(Boolean));
    fill('#fYear', [...new Set(DATA.map(o => d(o)?.getFullYear()).filter(Boolean))].sort((a, b) => b - a));

    function apply() {
      const q = $('#fQ').value.trim().toLowerCase(), shop = $('#fShop').value, st = $('#fStatus').value;
      const y = $('#fYear').value, m = $('#fMonth').value;
      const min = +$('#fMin').value || 0, max = +$('#fMax').value || Infinity;
      view = DATA.filter(o => {
        const dt = d(o);
        return (!shop || o.shop === shop) && (!st || o.status === st)
          && (!y || dt?.getFullYear() == y) && (!m || dt && dt.getMonth() + 1 == m)
          && o.total >= min && o.total <= max
          && (!q || (o.id + ' ' + o.shop + ' ' + o.items.map(i => i.name).join(' ')).toLowerCase().includes(q));
      }).sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0) * sortDir);
      render();
    }

    function render() {
      const s = k => view.reduce((t, o) => t + o[k], 0);
      $('#sCount').textContent = view.length.toLocaleString('vi-VN');
      $('#sTotal').textContent = vnd(s('total'));
      $('#sSave').textContent = vnd(s('save'));
      $('#sQty').textContent = s('qty').toLocaleString('vi-VN');
      $('#sAvg').textContent = vnd(s('total') / (view.length || 1));

      $('#tbody').innerHTML = view.map(o => `<tr>
        <td class="text-nowrap small">${d(o) ? d(o).toLocaleDateString('vi-VN') : ''}<div class="text-muted">${esc(o.id)}</div></td>
        <td class="fw-semibold">${esc(o.shop)}</td>
        <td><ul class="list-unstyled mb-0 small">${o.items.map(i => `<li>${esc(i.name)}${i.model ? ` <span class="text-muted">(${esc(i.model)})</span>` : ''} <span class="badge text-bg-light">x${i.qty}</span></li>`).join('')}</ul></td>
        <td><span class="badge text-bg-secondary">${esc(o.status)}</span></td>
        <td class="text-end">${o.qty}</td>
        <td class="text-end text-success small">${o.save ? vnd(o.save) : ''}</td>
        <td class="text-end fw-bold text-shopee text-nowrap">${vnd(o.total)}</td></tr>`).join('')
        || '<tr><td colspan="7" class="text-center text-muted py-5">Không có đơn phù hợp</td></tr>';

      // Top shop + theo tháng (theo bộ lọc hiện tại)
      const grp = f => Object.entries(view.reduce((m, o) => { const k = f(o); if (k) { m[k] ||= [0, 0]; m[k][0]++; m[k][1] += o.total; } return m; }, {}));
      const bars = (el, list) => {
        const mx = Math.max(1, ...list.map(x => x[1][1]));
        $(el).innerHTML = list.map(([k, [n, t]]) => `<div class="mb-2"><div class="d-flex justify-content-between small">
          <span class="text-truncate me-2">${esc(k)} <span class="text-muted">· ${n} đơn</span></span><b class="text-nowrap">${vnd(t)}</b></div>
          <div class="progress" style="height:6px"><div class="progress-bar bg-shopee" style="width:${t / mx * 100}%"></div></div></div>`).join('')
          || '<div class="text-muted small">Không có dữ liệu</div>';
      };
      bars('#topShop', grp(o => o.shop).sort((a, b) => b[1][1] - a[1][1]).slice(0, 10));
      bars('#byMonth', grp(o => d(o) && `${String(d(o).getMonth() + 1).padStart(2, '0')}/${d(o).getFullYear()}`)
        .sort((a, b) => b[0].split('/').reverse().join() .localeCompare(a[0].split('/').reverse().join())).slice(0, 12));
    }

    document.querySelectorAll('#filters input, #filters select').forEach(e => e.addEventListener('input', apply));
    $('#reset').onclick = () => { $('#filters').reset(); apply(); };
    document.querySelectorAll('th[data-k]').forEach(th => th.onclick = () => {
      sortDir = sortKey === th.dataset.k ? -sortDir : -1; sortKey = th.dataset.k;
      document.querySelectorAll('th[data-k]').forEach(x => x.dataset.dir = '');
      th.dataset.dir = sortDir > 0 ? '▲' : '▼'; apply();
    });
    $('#csv').onclick = () => {
      const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const rows = [['Mã đơn', 'Ngày', 'Shop', 'Trạng thái', 'Sản phẩm', 'Số lượng', 'Tiết kiệm', 'Thực trả'],
        ...view.map(o => [o.id, d(o)?.toLocaleString('vi-VN'), o.shop, o.status, o.items.map(i => `${i.name} x${i.qty}`).join(' | '), o.qty, o.save, o.total])];
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }));
      a.download = 'shopee_don_hang.csv'; a.click();
    };
    apply();
  }

  // ===== 4) TẠO FILE HTML =====
  const json = JSON.stringify(orders).replace(/</g, '\\u003c');
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Thống kê đơn Shopee</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
  :root{--shopee:#ee4d2d} body{background:#f5f5f5}
  .bg-shopee{background:var(--shopee)!important} .text-shopee{color:var(--shopee)!important}
  .hero{background:linear-gradient(135deg,#f53d2d,#ff6633)}
  .stat .card-body{padding:1rem 1.25rem} .stat .v{font-size:1.4rem;font-weight:700}
  th[data-k]{cursor:pointer;user-select:none;white-space:nowrap} th[data-k]::after{content:" " attr(data-dir);color:var(--shopee)}
  .table-wrap{max-height:75vh;overflow:auto} thead th{position:sticky;top:0;z-index:1}
</style></head><body>
<div class="hero text-white py-4 mb-4"><div class="container">
  <h1 class="h3 fw-bold mb-1">🛒 Thống kê đơn hàng Shopee</h1>
  <div class="opacity-75 small">Xuất lúc ${new Date().toLocaleString('vi-VN')} · ${orders.length} đơn</div>
</div></div>
<div class="container pb-5">
  <div class="row g-3 mb-4">
    ${[['sCount', 'Số đơn', ''], ['sTotal', 'Đã chi', 'text-shopee'], ['sSave', 'Tiết kiệm', 'text-success'], ['sQty', 'Sản phẩm', ''], ['sAvg', 'TB / đơn', '']]
      .map(([id, l, c]) => `<div class="col-6 col-md"><div class="card stat border-0 shadow-sm h-100"><div class="card-body">
        <div class="text-muted small">${l}</div><div id="${id}" class="v ${c}">-</div></div></div></div>`).join('')}
  </div>

  <form id="filters" class="card border-0 shadow-sm mb-4" onsubmit="return false"><div class="card-body row g-2 align-items-end">
    <div class="col-12 col-lg-3"><label class="form-label small mb-1">Tìm kiếm</label><input id="fQ" class="form-control" placeholder="Tên sản phẩm, shop, mã đơn..."></div>
    <div class="col-6 col-lg-2"><label class="form-label small mb-1">Shop</label><select id="fShop" class="form-select"><option value="">Tất cả</option></select></div>
    <div class="col-6 col-lg-2"><label class="form-label small mb-1">Trạng thái</label><select id="fStatus" class="form-select"><option value="">Tất cả</option></select></div>
    <div class="col-3 col-lg-1"><label class="form-label small mb-1">Năm</label><select id="fYear" class="form-select"><option value="">-</option></select></div>
    <div class="col-3 col-lg-1"><label class="form-label small mb-1">Tháng</label><select id="fMonth" class="form-select"><option value="">-</option>${[...Array(12)].map((_, i) => `<option>${i + 1}</option>`).join('')}</select></div>
    <div class="col-3 col-lg-1"><label class="form-label small mb-1">Từ ₫</label><input id="fMin" type="number" class="form-control"></div>
    <div class="col-3 col-lg-1"><label class="form-label small mb-1">Đến ₫</label><input id="fMax" type="number" class="form-control"></div>
    <div class="col-12 col-lg-1 d-flex gap-1"><button type="button" id="reset" class="btn btn-outline-secondary w-100" title="Xoá lọc">↺</button><button type="button" id="csv" class="btn bg-shopee text-white w-100" title="Tải CSV">CSV</button></div>
  </div></form>

  <div class="row g-4">
    <div class="col-lg-9"><div class="card border-0 shadow-sm"><div class="table-wrap">
      <table class="table table-hover align-middle mb-0"><thead class="table-light"><tr>
        <th data-k="ts" data-dir="▼">Ngày</th><th data-k="shop">Shop</th><th>Sản phẩm</th><th data-k="status">Trạng thái</th>
        <th data-k="qty" class="text-end">SL</th><th data-k="save" class="text-end">Tiết kiệm</th><th data-k="total" class="text-end">Thực trả</th>
      </tr></thead><tbody id="tbody"></tbody></table>
    </div></div></div>
    <div class="col-lg-3">
      <div class="card border-0 shadow-sm mb-4"><div class="card-body"><h6 class="fw-bold mb-3">🏪 Top 10 shop</h6><div id="topShop"></div></div></div>
      <div class="card border-0 shadow-sm"><div class="card-body"><h6 class="fw-bold mb-3">🗓️ 12 tháng gần nhất</h6><div id="byMonth"></div></div></div>
    </div>
  </div>
</div>
<script>(${app.toString()})(${json});</script>
</body></html>`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  a.download = `shopee_thong_ke_${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  console.log(`%c✅ Xong sau ${((Date.now() - t0) / 1000).toFixed(1)}s — đã tải file báo cáo HTML`, 'color:green;font-weight:bold');
})();
