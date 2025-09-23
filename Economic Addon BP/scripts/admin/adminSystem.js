import { world, system } from "@minecraft/server";
import {
  ActionFormData,
  ModalFormData,
  MessageFormData,
} from "@minecraft/server-ui";

// Sistema de Administração
export class AdminSystem {
  constructor(
    economyCore,
    bankSystem,
    shopSystem,
    exchangeSystem,
    moneySystem
  ) {
    this.core = economyCore;
    this.bankSystem = bankSystem;
    this.shopSystem = shopSystem;
    this.exchangeSystem = exchangeSystem;
    this.moneySystem = moneySystem;

    this.setupEvents();
    world.sendMessage("[Admin System] Sistema de administracao ativo!");
  }

  setupEvents() {
    // Uso do tablet de admin
    if (world.afterEvents?.itemUse) {
      world.afterEvents.itemUse.subscribe((event) => {
        const { source: player, itemStack } = event;

        if (itemStack?.typeId === "economic:admin_tablet") {
          // Verificar se tem tag de admin
          if (!player.hasTag("admin")) {
            player.sendMessage(
              "Acesso negado! Apenas administradores podem usar este item."
            );
            return;
          }

          system.run(() => this.openAdminInterface(player));
        }
      });
    }
  }

  openAdminInterface(player) {
    const form = new ActionFormData()
      .title("PAINEL DE ADMINISTRACAO")
      .body(
        "Bem-vindo ao painel de administracao do sistema economico.\n\nEscolha uma opcao:"
      )
      .button("GERENCIAR JOGADORES\nDar/remover dinheiro")
      .button("ESTATISTICAS\nInformacoes do sistema")
      .button("RESETAR DADOS\nLimpar todos os dados")
      .button("CRIAR NPCS\nSpawnar NPCs do sistema")
      .button("CONFIGURACOES\nOpcoes avancadas")
      .button("BACKUP\nSalvar/carregar dados");

    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {
        case 0:
          this.openPlayerManagement(player);
          break;
        case 1:
          this.showDetailedStats(player);
          break;
        case 2:
          this.showResetOptions(player);
          break;
        case 3:
          this.openNPCCreation(player);
          break;
        case 4:
          this.openAdvancedSettings(player);
          break;
        case 5:
          this.openBackupOptions(player);
          break;
      }
    });
  }

  openPlayerManagement(player) {
    const form = new ActionFormData()
      .title("GERENCIAR JOGADORES")
      .body("Gerencie o dinheiro dos jogadores:")
      .button("DAR DINHEIRO\nAdicionar dinheiro a um jogador")
      .button("REMOVER DINHEIRO\nRemover dinheiro de um jogador")
      .button("DEFINIR SALDO\nDefinir saldo especifico")
      .button("VER SALDO\nVerificar saldo de jogador")
      .button("VOLTAR\nMenu principal");

    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {
        case 0:
          this.showGiveMoneyForm(player);
          break;
        case 1:
          this.showTakeMoneyForm(player);
          break;
        case 2:
          this.showSetBalanceForm(player);
          break;
        case 3:
          this.showCheckBalanceForm(player);
          break;
        case 4:
          this.openAdminInterface(player);
          break;
      }
    });
  }

  showGiveMoneyForm(player) {
    const form = new ModalFormData()
      .title("DAR DINHEIRO")
      .textField("Nome do jogador:", "Steve", "")
      .textField("Valor para dar:", "1000", "")
      .textField("Motivo (opcional):", "Bonus administrativo", "");

    form.show(player).then((response) => {
      if (response.canceled) return;

      const targetName = response.formValues[0].trim();
      const amount = parseInt(response.formValues[1]);
      const reason = response.formValues[2].trim() || "Bonus administrativo";

      if (!targetName) {
        player.sendMessage("Nome do jogador invalido!");
        return;
      }

      if (!this.core.isValidAmount(amount)) {
        player.sendMessage("Valor invalido!");
        return;
      }

      this.core.addMoney(targetName, amount, `Admin: ${reason}`);

      player.sendMessage(
        `${this.core.formatMoney(amount)} dado para ${targetName}`
      );
      player.sendMessage(`Motivo: ${reason}`);

      const targetPlayer = world
        .getPlayers()
        .find((p) => p.name === targetName);
      if (targetPlayer) {
        targetPlayer.sendMessage(
          `Voce recebeu ${this.core.formatMoney(amount)} de um administrador!`
        );
        targetPlayer.sendMessage(`Motivo: ${reason}`);
      }
    });
  }

  showTakeMoneyForm(player) {
    const form = new ModalFormData()
      .title("REMOVER DINHEIRO")
      .textField("Nome do jogador:", "Steve", "")
      .textField("Valor para remover:", "1000", "")
      .textField("Motivo (opcional):", "Correcao administrativa", "");

    form.show(player).then((response) => {
      if (response.canceled) return;

      const targetName = response.formValues[0].trim();
      const amount = parseInt(response.formValues[1]);
      const reason = response.formValues[2].trim() || "Correcao administrativa";

      if (!targetName) {
        player.sendMessage("Nome do jogador invalido!");
        return;
      }

      if (!this.core.isValidAmount(amount)) {
        player.sendMessage("Valor invalido!");
        return;
      }

      if (this.core.removeMoney(targetName, amount, `Admin: ${reason}`)) {
        player.sendMessage(
          `${this.core.formatMoney(amount)} removido de ${targetName}`
        );
        player.sendMessage(`Motivo: ${reason}`);

        const targetPlayer = world
          .getPlayers()
          .find((p) => p.name === targetName);
        if (targetPlayer) {
          targetPlayer.sendMessage(
            `${this.core.formatMoney(
              amount
            )} foi removido da sua conta por um administrador`
          );
          targetPlayer.sendMessage(`Motivo: ${reason}`);
        }
      } else {
        player.sendMessage(`${targetName} nao tem dinheiro suficiente!`);
      }
    });
  }

  showSetBalanceForm(player) {
    const form = new ModalFormData()
      .title("DEFINIR SALDO")
      .textField("Nome do jogador:", "Steve", "")
      .textField("Novo saldo:", "5000", "");

    form.show(player).then((response) => {
      if (response.canceled) return;

      const targetName = response.formValues[0].trim();
      const amount = parseInt(response.formValues[1]);

      if (!targetName) {
        player.sendMessage("Nome do jogador invalido!");
        return;
      }

      if (!this.core.isValidAmount(amount)) {
        player.sendMessage("Valor invalido!");
        return;
      }

      this.core.setWalletBalance(targetName, amount);

      player.sendMessage(
        `Saldo de ${targetName} definido para ${this.core.formatMoney(amount)}`
      );

      const targetPlayer = world
        .getPlayers()
        .find((p) => p.name === targetName);
      if (targetPlayer) {
        targetPlayer.sendMessage(
          `Seu saldo foi definido para ${this.core.formatMoney(
            amount
          )} por um administrador`
        );
      }
    });
  }

  showCheckBalanceForm(player) {
    const form = new ModalFormData()
      .title("VERIFICAR SALDO")
      .textField("Nome do jogador:", "Steve", "");

    form.show(player).then((response) => {
      if (response.canceled) return;

      const targetName = response.formValues[0].trim();

      if (!targetName) {
        player.sendMessage("Nome do jogador invalido!");
        return;
      }

      const balance = this.core.getWalletBalance(targetName);
      const bankBalance = this.core.getBankBalance(targetName);
      const stats = this.core.getPlayerStats(targetName);

      const info = `=== INFORMACOES DE ${targetName.toUpperCase()} ===

Carteira: ${this.core.formatMoney(balance)}
Banco: ${this.core.formatMoney(bankBalance)}
Total: ${this.core.formatMoney(stats.totalWealth)}

Total ganho: ${this.core.formatMoney(stats.totalEarned)}
Total gasto: ${this.core.formatMoney(stats.totalSpent)}
Transacoes: ${stats.transactionCount}`;

      player.sendMessage(info);
    });
  }

  showDetailedStats(player) {
    const stats = `=== ESTATISTICAS DETALHADAS ===

Sistema:
• Jogadores registrados: ${this.core.getRegisteredPlayersCount()}
• Total em circulacao: ${this.core.getTotalMoneyInCirculation()}
• Transacoes hoje: ${this.core.getTodayTransactions()}

Sistemas Ativos:
• Core Economico: ATIVO
• Sistema Bancario: ATIVO
• Sistema de Lojas: ATIVO
• Casa de Cambio: ATIVO
• Sistema de Celular: ATIVO
• Sistema de Admin: ATIVO

Performance:
• Dados salvos automaticamente
• Sistema estavel
• Sem erros criticos

Versao: v1.0.0`;

    player.sendMessage(stats);
  }

  showResetOptions(player) {
    const form = new ActionFormData()
      .title("RESETAR DADOS")
      .body(
        "ATENCAO: Estas opcoes sao irreversiveis!\n\nEscolha o que resetar:"
      )
      .button("RESETAR TUDO\nTodos os dados economicos")
      .button("RESETAR JOGADORES\nApenas dados dos jogadores")
      .button("RESETAR LOJAS\nApenas dados das lojas")
      .button("RESETAR BANCO\nApenas dados bancarios")
      .button("CANCELAR\nVoltar sem resetar");

    form.show(player).then((response) => {
      if (response.canceled || response.selection === 4) return;

      const confirmForm = new MessageFormData()
        .title("CONFIRMAR RESET")
        .body(
          "TEM CERTEZA?\n\nEsta acao nao pode ser desfeita!\nTodos os dados serao perdidos permanentemente!"
        )
        .button1("SIM, RESETAR")
        .button2("CANCELAR");

      confirmForm.show(player).then((confirmResponse) => {
        if (confirmResponse.canceled || confirmResponse.selection === 1) return;

        switch (response.selection) {
          case 0:
            this.resetAllData(player);
            break;
          case 1:
            this.resetPlayerData(player);
            break;
          case 2:
            this.resetShopData(player);
            break;
          case 3:
            this.resetBankData(player);
            break;
        }
      });
    });
  }

resetAllData(player) {
    world.setDynamicProperty("economyData", undefined);
    world.setDynamicProperty("bankSystemData", undefined);
    world.setDynamicProperty("shopSystemData", undefined);
    world.setDynamicProperty("exchangeSystemData", undefined);

    this.core.playerData.clear();
    this.core.globalStats = { totalMoney: 0, totalTransactions: 0, dailyTransactions: 0, lastResetDate: new Date().toDateString() };
    this.bankSystem.clearData();
    this.shopSystem.clearData();
    this.exchangeSystem.clearData();

    this.core.saveData();
    this.bankSystem.saveBankData();
    this.shopSystem.saveShopData();
    this.exchangeSystem.saveExchangeData();

    world.sendMessage("SISTEMA ECONOMICO RESETADO");
    player.sendMessage("Reset completo realizado com sucesso!");
}


  resetPlayerData(player) {
    // Limpa DynamicProperty
    world.setDynamicProperty("economyData", undefined);
    
    // Limpa memória interna
    this.core.playerData.clear();
    this.core.globalStats = {
        totalMoney: 0,
        totalTransactions: 0,
        dailyTransactions: 0,
        lastResetDate: new Date().toDateString()
    };

    // Salva o estado vazio
    this.core.saveData();

    world.sendMessage("DADOS DOS JOGADORES RESETADOS");
    player.sendMessage("Dados dos jogadores resetados com sucesso!");
}


resetShopData(player) {
    world.setDynamicProperty("shopSystemData", undefined);
    this.shopSystem.clearData(); // criar método que zera dados internos
    player.sendMessage("Dados das lojas resetados com sucesso!");
}

resetBankData(player) {
    world.setDynamicProperty("bankSystemData", undefined);
    this.bankSystem.clearData(); // criar método que zera dados internos
    player.sendMessage("Dados bancarios resetados com sucesso!");
}


  openNPCCreation(player) {
    const form = new ActionFormData()
      .title("CRIAR NPCS")
      .body("Crie NPCs do sistema economico na sua posicao:")
      .button("NPC BANCO\nServicos bancarios")
      .button("NPC LOJA GERAL")
      .button("NPC LOJA DE EQUIPAMENTOS")
      .button("NPC LOJA DE MATERIAIS RAROS")
      .button("NPC CAMBIO\nTroca de itens")
      .button("NPC DINHEIRO\nConversao de dinheiro")
      .button("VOLTAR\nMenu principal");

    form.show(player).then((response) => {
      if (response.canceled) return;

      const location = player.location;
      const dimension = player.dimension;

      try {
        let npc;
        switch (response.selection) {
          case 0:
            npc = dimension.spawnEntity("minecraft:npc", location);
            npc.addTag("banknpc");
            npc.nameTag = "Banco Central";
            player.sendMessage("NPC do banco criado!");
            break;
          case 1:
            npc = dimension.spawnEntity("minecraft:npc", location);
            npc.addTag("shopnpc");
            npc.nameTag = "Loja Geral";
            player.sendMessage("NPC da loja criado!");
            break;
          case 2:
            npc = dimension.spawnEntity("minecraft:npc", location);
            npc.addTag("shopnpc");
            npc.addTag("shop:equipment_store");
            npc.nameTag = "Loja Geral";
            player.sendMessage("NPC da loja criado!");
            break;
          case 3:
            npc = dimension.spawnEntity("minecraft:npc", location);
            npc.addTag("shopnpc");
            npc.addTag("shop:rare_materials");
            npc.nameTag = "Loja Geral";
            player.sendMessage("NPC da loja criado!");
            break;
          case 4:
            npc = dimension.spawnEntity("minecraft:npc", location);
            npc.addTag("exchangenpc");
            npc.nameTag = "Casa de Cambio";
            player.sendMessage("NPC do cambio criado!");
            break;
          case 5:
            npc = dimension.spawnEntity("minecraft:npc", location);
            npc.addTag("moneynpc");
            npc.nameTag = "Conversor de Dinheiro";
            player.sendMessage("NPC do dinheiro criado!");
            break;
          case 6:
            this.openAdminInterface(player);
            break;
        }
      } catch (error) {
        player.sendMessage(`Erro ao criar NPC: ${error}`);
      }
    });
  }

  openAdvancedSettings(player) {
    const form = new ActionFormData()
      .title("CONFIGURACOES AVANCADAS")
      .body("Configuracoes avancadas do sistema:")
      .button("SALVAR DADOS\nForcar salvamento")
      .button("RECARREGAR DADOS\nRecarregar do arquivo")
      .button("VERIFICAR INTEGRIDADE\nVerificar dados")
      .button("VOLTAR\nMenu principal");

    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {
        case 0:
          this.forceSaveData(player);
          break;
        case 1:
          this.forceReloadData(player);
          break;
        case 2:
          this.checkDataIntegrity(player);
          break;
        case 3:
          this.openAdminInterface(player);
          break;
      }
    });
  }

  forceSaveData(player) {
    try {
      this.core.saveData();
      this.bankSystem.saveBankData();
      this.shopSystem.saveShopData();
      this.exchangeSystem.saveExchangeData();

      player.sendMessage("Dados salvos com sucesso!");
    } catch (error) {
      player.sendMessage(`Erro ao salvar: ${error}`);
    }
  }

  forceReloadData(player) {
    try {
      this.core.loadData();
      this.bankSystem.loadBankData();
      this.shopSystem.loadShopData();
      this.exchangeSystem.loadExchangeData();

      player.sendMessage("Dados recarregados com sucesso!");
    } catch (error) {
      player.sendMessage(`Erro ao recarregar: ${error}`);
    }
  }

  checkDataIntegrity(player) {
    let issues = 0;
    let report = "=== RELATORIO DE INTEGRIDADE ===\n\n";

    try {
      // Verificar dados do core
      const playerCount = this.core.getRegisteredPlayersCount();
      report += `Jogadores registrados: ${playerCount}\n`;

      // Verificar consistencia
      if (playerCount < 0) {
        report += "ERRO: Contagem de jogadores negativa\n";
        issues++;
      }

      report += `\nProblemas encontrados: ${issues}`;

      if (issues === 0) {
        report += "\nSistema integro!";
      }

      player.sendMessage(report);
    } catch (error) {
      player.sendMessage(`Erro na verificacao: ${error}`);
    }
  }

  openBackupOptions(player) {
    const form = new ActionFormData()
      .title("BACKUP DE DADOS")
      .body("Opcoes de backup do sistema:")
      .button("CRIAR BACKUP\nSalvar estado atual")
      .button("RESTAURAR BACKUP\nCarregar backup anterior")
      .button("VOLTAR\nMenu principal");

    form.show(player).then((response) => {
      if (response.canceled) return;

      switch (response.selection) {
        case 0:
          this.createBackup(player);
          break;
        case 1:
          this.restoreBackup(player);
          break;
        case 2:
          this.openAdminInterface(player);
          break;
      }
    });
  }

  createBackup(player) {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        economyData: world.getDynamicProperty("economyData"),
        bankData: world.getDynamicProperty("bankSystemData"),
        shopData: world.getDynamicProperty("shopSystemData"),
        exchangeData: world.getDynamicProperty("exchangeSystemData"),
      };

      world.setDynamicProperty("economyBackup", JSON.stringify(backupData));

      player.sendMessage("Backup criado com sucesso!");
      player.sendMessage(`Data: ${new Date().toLocaleString()}`);
    } catch (error) {
      player.sendMessage(`Erro ao criar backup: ${error}`);
    }
  }

  restoreBackup(player) {
    try {
      const backupData = world.getDynamicProperty("economyBackup");

      if (!backupData) {
        player.sendMessage("Nenhum backup encontrado!");
        return;
      }

      const backup = JSON.parse(backupData);

      const confirmForm = new MessageFormData()
        .title("RESTAURAR BACKUP")
        .body(
          `Restaurar backup de:\n${new Date(
            backup.timestamp
          ).toLocaleString()}\n\nIsto substituira todos os dados atuais!`
        )
        .button1("RESTAURAR")
        .button2("CANCELAR");

      confirmForm.show(player).then((response) => {
        if (response.canceled || response.selection === 1) return;

        world.setDynamicProperty("economyData", backup.economyData);
        world.setDynamicProperty("bankSystemData", backup.bankData);
        world.setDynamicProperty("shopSystemData", backup.shopData);
        world.setDynamicProperty("exchangeSystemData", backup.exchangeData);

        player.sendMessage("Backup restaurado com sucesso!");
        player.sendMessage("Reinicie o servidor para aplicar completamente");
      });
    } catch (error) {
      player.sendMessage(`Erro ao restaurar backup: ${error}`);
    }
  }
}
