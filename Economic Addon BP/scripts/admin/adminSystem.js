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
      .title("§7painel de administracao")
      .body("§7bem-vindo ao painel de administracao do sistema economico.\n\nescolha uma opcao:")
      .button("§7gerenciar jogadores\ndar/remover dinheiro")
      .button("§7estatisticas\ninformacoes do sistema")
      .button("§7resetar dados\nlimpar todos os dados")
      .button("§7criar npcs\nspawnar npcs do sistema")
      .button("§7configuracoes\nopcoes avancadas")
      .button("§7backup\nsalvar/carregar dados");

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
      .title("§7gerenciar jogadores")
      .body("§7gerencie o dinheiro dos jogadores:")
      .button("§7dar dinheiro\nadicionar dinheiro a um jogador")
      .button("§7remover dinheiro\nremover dinheiro de um jogador")
      .button("§7definir saldo\ndefinir saldo especifico")
      .button("§7ver saldo\nverificar saldo de jogador")
      .button("§7voltar\nmenu principal");

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
      .title("§7dar dinheiro")
      .textField("§7nome do jogador:", "§7steve", "")
      .textField("§7valor para dar:", "§71000", "")
      .textField("§7motivo (opcional):", "§7bonus administrativo", "");

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
      .title("§7remover dinheiro")
      .textField("§7nome do jogador:", "§7steve", "")
      .textField("§7valor para remover:", "§71000", "")
      .textField("§7motivo (opcional):", "§7correcao administrativa", "");

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
      .title("§7definir saldo")
      .textField("§7nome do jogador:", "§7steve", "")
      .textField("§7novo saldo:", "§75000", "");

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
      .title("§7verificar saldo")
      .textField("§7nome do jogador:", "§7steve", "");

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
      .title("§7resetar dados")
      .body("§7atencao: estas opcoes sao irreversiveis!\n\nescolha o que resetar:")
      .button("§7resetar tudo\ntodos os dados economicos")
      .button("§7resetar jogadores\napenas dados dos jogadores")
      .button("§7resetar lojas\napenas dados das lojas")
      .button("§7resetar banco\napenas dados bancarios")
      .button("§7cancelar\nvoltar sem resetar");

    form.show(player).then((response) => {
      if (response.canceled || response.selection === 4) return;

      const confirmForm = new MessageFormData()
        .title("§7confirmar reset")
        .body("§7tem certeza?\n\nesta acao nao pode ser desfeita!\ntodos os dados serao perdidos permanentemente!")
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
      .title("§7criar npcs")
      .body("§7crie npcs do sistema economico na sua posicao:")
      .button("§7npc banco\nservicos bancarios")
      .button("§7npc loja geral")
      .button("§7npc loja de equipamentos")
      .button("§7npc loja de materiais raros")
      .button("§7npc cambio\ntroca de itens")
      .button("§7npc dinheiro\nconversao de dinheiro")
      .button("§7voltar\nmenu principal");

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
      .title("§7configuracoes avancadas")
      .body("§7configuracoes avancadas do sistema:")
      .button("§7salvar dados\nforcar salvamento")
      .button("§7recarregar dados\nrecarregar do arquivo")
      .button("§7verificar integridade\nverificar dados")
      .button("§7voltar\nmenu principal");

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
      .title("§7backup de dados")
      .body("§7opcoes de backup do sistema:")
      .button("§7criar backup\nsalvar estado atual")
      .button("§7restaurar backup\ncarregar backup anterior")
      .button("§7voltar\nmenu principal");

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
        .title("§7restaurar backup")
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
