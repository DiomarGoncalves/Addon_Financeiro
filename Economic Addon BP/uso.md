Como usar o Economic Addon completo (versão sem comandos, só menus e NPCs):
Ative o Behavior Pack no seu mundo.

Abra as configurações do mundo.
Vá em "Pacotes de Comportamento" e ative o "Economic Addon BP".
Coloque NPCs para cada sistema

Use o comando /summon npc para criar um NPC.
Edite o NPC e adicione a tag correspondente usando /tag @e[type=npc,sort=nearest,limit=1] add <tag> ou via bloco de comando.
Tags disponíveis:

banknpc → abre o menu do banco (depósito, saque, transferências)
shopnpc → abre o menu de loja (comprar itens, ofertas, histórico)
exchangenpc → abre o menu de câmbio (vender itens por dinheiro, ver cotações)
moneynpc → abre o menu de dinheiro físico/digital (converter saldo em itens, converter itens em saldo, transferir dinheiro)
Interaja com o NPC

Clique com o botão direito no NPC com a tag desejada.
O menu UI do sistema correspondente será aberto para você.
Use os menus para todas as ações

Banco: Deposite, saque, transfira dinheiro entre jogadores.
Loja: Compre itens, veja ofertas especiais, histórico de compras.
Câmbio: Venda itens do inventário por dinheiro, veja limites diários, histórico de vendas.
Dinheiro físico/digital: Converta saldo em itens (moedas/notas), converta itens em saldo, transfira dinheiro, veja extrato.
Não é necessário usar comandos no chat

Todo o sistema é acessado apenas por menus UI e NPCs.
Administrações avançadas (criação de lojas, reset de economia) devem ser feitas editando o código ou via menus de NPCs administrativos (se implementados).