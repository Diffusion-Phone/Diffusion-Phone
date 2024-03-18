import { createContext } from 'react';
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Pixelana } from "../target/types/pixelana";
import { expect } from "chai";

function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

describe("anchor", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Pixelana as Program<Pixelana>;
  const provider = anchor.getProvider();
  const programProvider = program.provider as anchor.AnchorProvider;
  let host = programProvider.wallet
  let participants = [];
  const [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([Buffer.from("vault")], program.programId);

  for (let i = 0; i < 3; i++) {
    let participant = anchor.web3.Keypair.generate();
    participants.push(participant);
  }

  async function airdropSol(publicKey, lamports = 1000000000) {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(publicKey, lamports),
      "confirmed"
    );
  }

  async function initPlayer(player: PublicKey) {
    const [playerPda, playerBump] = PublicKey.findProgramAddressSync([Buffer.from("player"), player.toBuffer()], program.programId);
    const tx = await program.methods.initializePlayer().accounts({
      payer: player,
      player: playerPda
    }).rpc()
    console.log("init player: ", tx)
    return [playerPda, playerBump] as const;
  }


  before('init vault', async () => {
    const initVault = await program.methods.initializeVault().accounts({
      creator: host.publicKey,
      vault: vaultPda
    }).rpc();
    console.log("init vault tx:", initVault);

    await program.account.vault.fetch(vaultPda).then((vault) => {
      console.log("vault:", vault)
    })
  })

  it('init player: host', async () => {
    const hostPub = programProvider.wallet.publicKey;
    const [hostPda, hostBump] = await initPlayer(hostPub);

    await program.account.player.fetch(hostPda).then((player) => {
      console.log("host:", player)
    })

    const hostDeposit = await program.methods.depositToVault(new anchor.BN(10000000)).accounts({ 
      depositor: hostPub,
      vault: vaultPda,
      player: hostPda
    }).rpc();

    console.log("deposited to vault tx:", hostDeposit);

    const player = await program.account.player.fetch(hostPda);

    expect(player.balance.toNumber()).to.equal(10000000);
    expect(player.currentGame).to.equal(null);
    expect(player.games).to.equal(0);
  })


  it('reinit host player', async () => {

    const hostPub = programProvider.wallet.publicKey;
    // try to reinit player 1
    // await airdropSol(player, 3000000000);
    const [hostPda, _] = await initPlayer(hostPub);

    const host = await program.account.player.fetch(hostPda);
    expect(host.balance.toNumber()).to.equal(10000000);
    expect(host.currentGame).to.equal(null);
    expect(host.games).to.equal(0);
  })

  //test it once
  it('init game', async () => {
    const game_id = generateRandomString(8);
    const hostPub = programProvider.wallet.publicKey;
    const [gamePda, gameBump] = PublicKey.findProgramAddressSync([Buffer.from("game"), Buffer.from(game_id)], program.programId);

    const [hostPda, hostBump] = await PublicKey.findProgramAddressSync([Buffer.from("player"), hostPub.toBuffer()], program.programId);

    const game  = await program.methods.initializeGame(game_id).accounts({
      game: gamePda,
      payer: hostPub,
      host: hostPda
    }).rpc();

    console.log("init game tx: ", game)

    await program.account.game.fetch(gamePda).then((game) => {
      console.log("game:", game)
    })
  })

  // const game_id = generateRandomString(8);
  // const [hostPda, hostBump] = PublicKey.findProgramAddressSync([Buffer.from("player"), host.publicKey.toBuffer()], program.programId);
  // const [gamePda, gameBump] = PublicKey.findProgramAddressSync([Buffer.from("game"), Buffer.from(game_id)], program.programId);
  // const game  = await program.methods.initializeGame(game_id).accounts({
  //   game: gamePda,
  //   payer: host.publicKey,
  //   host: hostPda
  // }).rpc();

  // it('init player: 1', async () => {

  //   // const [gamePda, gameBump] = PublicKey.findProgramAddressSync([Buffer.from("game")], program.programId);
  //   // const host = programProvider.wallet.publicKey;
  //   const player = participants[0].publicKey;
  //   await airdropSol(player, 3000000000);
  //   const [playerPda, _] = await initPlayer(player);

  //   const player1JoinGame = await program.methods.joinGame().accounts({
  //     payer: player.PublicKey,
  //     player: playerPda,
  //     game: gamePda
  //   }).rpc()

  //   console.log("player 1 join game tx: ", player1JoinGame)

  //   await program.account.game.fetch(gamePda).then((game) => {
  //     console.log("game:", game)
  //   })
  // })


    // Initialize the game

  // it('Allows participants to join the game', async () => {
  //   // Create and add 7 participants
  //   for (let i = 0; i < 7; i++) {
  //     let participant = anchor.web3.Keypair.generate();
  //     await airdropSol(participant.publicKey);

  //     await program.rpc.joinGame({
  //       accounts: {
  //         game: gameAccount.publicKey,
  //         participant: participant.publicKey,
  //       },
  //       signers: [participant],
  //     });

  //     participants.push(participant);
  //   }

  //   // Fetch the updated game account
  //   const game = await program.account.game.fetch(gameAccount.publicKey);
  //   assert.strictEqual(game.participants.length, 7);
  // });

  // it('Host submits a story', async () => {
  //   const story = "Once upon a time...";
  //   await program.rpc.submitStory(story, {
  //     accounts: {
  //       game: gameAccount.publicKey,
  //       host: host.publicKey,
  //     },
  //     signers: [host],
  //   });

  //   // Verify the story was submitted
  //   const game = await program.account.game.fetch(gameAccount.publicKey);
  //   assert.strictEqual(game.story, story);
  // });

  // it('Participants submit their drawings', async () => {
  //   for (let i = 0; i < participants.length; i++) {
  //     const drawingRef = `drawing_${i}`;
  //     await program.rpc.submitDrawing(drawingRef, {
  //       accounts: {
  //         game: gameAccount.publicKey,
  //         participant: participants[i].publicKey,
  //       },
  //       signers: [participants[i]],
  //     });
  //   }

  //   // Verify all drawings were submitted
  //   const game = await program.account.game.fetch(gameAccount.publicKey);
  //   assert.strictEqual(game.drawings.length, participants.length);
  // });

  // it('Host selects the winning drawing', async () => {
  //   const winningDrawing = game.drawings[0].drawingRef; // Example: Select the first drawing as the winner
  //   await program.rpc.selectWinner(winningDrawing, {
  //     accounts: {
  //       game: gameAccount.publicKey,
  //       host: host.publicKey,
  //     },
  //     signers: [host],
  //   });

  //   // Verify the winning drawing was selected
  //   const game = await program.account.game.fetch(gameAccount.publicKey);
  //   assert.strictEqual(game.winningDrawing, winningDrawing);
  // });
});
