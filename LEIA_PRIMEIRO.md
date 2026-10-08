# Fraude Lab — versão sem subpastas

Todos os 27 arquivos estão soltos, no mesmo nível. O servidor foi ajustado para ler os dados e as páginas nessa organização.

## Enviar pelo site do GitHub

1. Extraia o ZIP no computador.
2. No GitHub, abra o repositório e clique em Add file → Upload files.
3. Clique em Choose your files / Escolher arquivos.
4. Entre na pasta dos arquivos extraídos, selecione TODOS os arquivos e envie.
5. Clique em Commit changes.

Não precisa enviar pastas nem criar diretórios. server.js e package.json devem aparecer diretamente na raiz do repositório, junto dos CSVs e demais arquivos. Se já enviou parte da versão antiga, use um repositório novo para evitar misturar as versões. Não envie um .env com sua senha.

## Publicar no Render

New → Web Service → conecte o repositório.

Preencha:
- Runtime / Language: Node
- Build Command: node --check server.js
- Start Command: node server.js
- Health Check Path: /health
- Plano: Free, para a configuração padrão

Em Environment Variables:
- NODE_VERSION = 24
- ADMIN_USER = professora
- ADMIN_PASSWORD = sua senha, com pelo menos 12 caracteres
- STATE_DIR = ./runtime

O Render define PORT automaticamente. Clique em Deploy Web Service e aguarde a publicação. Há também render.yaml para configuração por Blueprint.

## Usar em sala

Compartilhe o endereço principal do servidor com os alunos. Eles não precisam de senha. Para seu painel, acrescente /professora ao endereço. Entre com usuário professora e a senha definida no Render.

A missão inicial já está disponível. Aperte Liberar desafio 1, depois 2, depois 3, no momento que desejar. Os alunos recebem os comunicados e downloads na próxima consulta automática, normalmente em cerca de dois segundos. Abas em segundo plano e conexão lenta podem demorar mais.

Você também pode enviar avisos, encerrar, reabrir e reiniciar. Encerrar exibe o aviso, mas mantém os downloads liberados. Reiniciar bloqueia novamente as surpresas e limpa os avisos; não apaga arquivos que os alunos já baixaram.

Os alunos devem manter a página DESTE servidor aberta. O laboratório offline e o site privado anterior não recebem os comandos. Os modelos são treinados no Colab/Python; as entregas são recolhidas no canal indicado por você. Este servidor não recebe notebooks.

## Dados

Os mesmos 89 mil registros do pacote anterior:
- historico.csv: 60 mil linhas, incluindo 900 duplicatas didáticas.
- pedidos_iniciais.csv: 5 mil compras novas.
- dicionario.csv: significado e disponibilidade das colunas.
- desafio1.csv: 8 mil compras da nova plataforma.
- auditoria_desafio2.csv: 2 mil compras auditadas com resposta.
- desafio2.csv: 8 mil compras futuras.
- desafio3.csv: 6 mil compras futuras.

Os quatro ZIPs de rodadas permitem baixar os arquivos de cada rodada juntos. Os downloads futuros ficam protegidos no back-end até a liberação, mesmo com os CSVs na raiz do projeto. Não publique como site estático: use Web Service e node server.js, para preservar essa proteção.

Não há gabaritos finais nem solução da professora neste servidor. O histórico e a auditoria têm rótulos, conforme o exercício. Depois de liberados, os dados são acessíveis a quem tiver o link do servidor; não há cadastro de equipes.

## Persistência

O servidor cria a pasta runtime automaticamente para guardar as liberações. Não precisa criar ou enviar essa pasta ao GitHub.

No Render gratuito, o estado é perdido quando o serviço reinicia, fica inativo ou sofre redeploy. As bases permanecem no projeto, mas pode ser necessário liberar novamente as rodadas. Confira o painel antes da aula.

render-persistente.yaml é uma alternativa PAGA com disco montado em /var/data e STATE_DIR=/var/data/fraude-lab. Use como especificação Blueprint ou substitua render.yaml por ele somente se optar por esse plano. Nenhum serviço é contratado automaticamente.

## Executar localmente

Instale Node.js 24. Copie .env.example para .env e preencha ADMIN_PASSWORD com sua senha entre aspas. No terminal, dentro da pasta dos arquivos, execute npm start. Abra http://localhost:3000/professora. Localhost funciona apenas no seu computador. Em servidor público, use HTTPS.

Não há dependências externas. Execute npm test para conferir liberação compartilhada, arquivos bloqueados, autorização, avisos, reinício e persistência. O back-end foi testado; a interface não passou por inspeção visual no navegador.

Use uma única instância Node. Não configure múltiplas réplicas gravando o mesmo JSON. Para Docker, use o Dockerfile e um volume persistente em /app/runtime. Depois de reiniciar o processo, atualize a página da professora para renovar a autorização dos botões.

Documentação: https://render.com/docs/deploy-node-express-app e https://render.com/docs/free.
