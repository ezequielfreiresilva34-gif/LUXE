/* =========================================================
   LUXE STORE — Integração Supabase
   ---------------------------------------------------------
   1. Crie um projeto em https://supabase.com
   2. Rode o script SQL (supabase-schema.sql) no SQL Editor
   3. Copie a URL e a chave anon em Settings > API
   4. Cole abaixo nas constantes SUPABASE_URL e SUPABASE_ANON_KEY
   ========================================================= */

   const SUPABASE_URL = 'https://qxwpxwgpcqozcegdrtjs.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4d3B4d2dwY3FvemNlZ2RydGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwMDQxNzAsImV4cCI6MjEwOTU4MDE3MH0.nxQlyate8LEIAd0s0v4NKcCjhzNEatLALKY1CCbvz98';
   const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   
   // ===== CARRINHO (memória local) =====
   let carrinho = JSON.parse(localStorage.getItem('luxe_cart') || '[]');
   
   function salvarCarrinho() {
     localStorage.setItem('luxe_cart', JSON.stringify(carrinho));
     document.getElementById('cart-count').textContent = carrinho.length;
   }
   
   // ===== CARREGAR PRODUTOS DO SUPABASE =====
   async function carregarProdutos() {
     const lista = document.getElementById('lista-produtos');
     const msg = document.getElementById('msg-produtos');
   
     const { data, error } = await supabaseClient
       .from('produtos')
       .select('*')
       .eq('ativo', true)
       .order('criado_em', { ascending: false });
   
     if (error) {
       msg.textContent = 'Erro ao carregar produtos. Verifique a conexão com o Supabase.';
       console.error(error);
       return;
     }
   
     if (data.length === 0) {
       msg.textContent = 'Nenhum produto cadastrado ainda.';
       return;
     }
   
     lista.innerHTML = data.map(p => `
       <div class="card">
         <img src="${p.imagem_url || 'https://placehold.co/400x520/d4af37/1a1a1a?text=LUXE'}"
              alt="${p.nome}" onerror="this.src='https://placehold.co/400x520/d4af37/1a1a1a?text=LUXE'"/>
         <div class="card-body">
           <h4>${p.nome}</h4>
           <p class="preco">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</p>
           <button onclick="adicionarAoCarrinho(${JSON.stringify(p).replace(/"/g, '&quot;')})">
             Adicionar ao Carrinho
           </button>
         </div>
       </div>
     `).join('');
   }
   
   // ===== CARRINHO =====
   function adicionarAoCarrinho(produto) {
     carrinho.push(produto);
     salvarCarrinho();
     renderCarrinho();
   }
   
   function removerDoCarrinho(index) {
     carrinho.splice(index, 1);
     salvarCarrinho();
     renderCarrinho();
   }
   
   function renderCarrinho() {
     const container = document.getElementById('itens-carrinho');
     if (carrinho.length === 0) {
       container.innerHTML = '<p>Carrinho vazio.</p>';
     } else {
       container.innerHTML = carrinho.map((item, i) => `
         <div class="item-carrinho">
           <span>${item.nome} — R$ ${Number(item.preco).toFixed(2).replace('.', ',')}</span>
           <button onclick="removerDoCarrinho(${i})">✕</button>
         </div>
       `).join('');
     }
     const total = carrinho.reduce((s, i) => s + Number(i.preco), 0);
     document.getElementById('total-carrinho').textContent =
       'R$ ' + total.toFixed(2).replace('.', ',');
   }
   
   // ===== MODAL =====
   document.getElementById('btn-carrinho').addEventListener('click', () => {
     renderCarrinho();
     document.getElementById('modal-carrinho').classList.add('aberto');
   });
   document.getElementById('fechar-modal').addEventListener('click', () => {
     document.getElementById('modal-carrinho').classList.remove('aberto');
   });
   
   // ===== CHECKOUT → SALVAR PEDIDO NO SUPABASE =====
   document.getElementById('form-checkout').addEventListener('submit', async (e) => {
     e.preventDefault();
     const msg = document.getElementById('msg-checkout');
   
     if (carrinho.length === 0) {
       msg.textContent = 'Seu carrinho está vazio.';
       return;
     }
   
     const nome = document.getElementById('nome-cliente').value.trim();
     const email = document.getElementById('email-cliente').value.trim();
     const total = carrinho.reduce((s, i) => s + Number(i.preco), 0);
   
     // Insere o pedido
     const { data: pedido, error: erroPedido } = await supabaseClient
       .from('pedidos')
       .insert({ nome_cliente: nome, email_cliente: email, total })
       .select()
       .single();
   
     if (erroPedido) {
       msg.textContent = 'Erro ao criar o pedido. Tente novamente.';
       console.error(erroPedido);
       return;
     }
   
     // Insere os itens do pedido
     const itens = carrinho.map(item => ({
       pedido_id: pedido.id,
       produto_id: item.id,
       quantidade: 1,
       preco_unitario: item.preco
     }));
   
     const { error: erroItens } = await supabaseClient
       .from('itens_pedido')
       .insert(itens);
   
     if (erroItens) {
       msg.textContent = 'Erro ao salvar os itens do pedido.';
       console.error(erroItens);
       return;
     }
   
     carrinho = [];
     salvarCarrinho();
     renderCarrinho();
     document.getElementById('form-checkout').reset();
     msg.textContent = `Pedido #${pedido.id} realizado com sucesso! ✦`;
   });
   
   // ===== INICIALIZAÇÃO =====
   salvarCarrinho();
   carregarProdutos();