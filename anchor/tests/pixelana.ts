import { getKeypairFromFile } from '@solana-developers/helpers';
import { createContext } from 'react';
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Pixelana } from "../target/types/pixelana";
import { expect } from "chai";
import exp from 'constants';

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
  // let participants: Array<Keypair> = [];
  const [vaultPda, vaultBump] = PublicKey.findProgramAddressSync([Buffer.from("vault")], program.programId);

  // for (let i = 0; i < 3; i++) {
  //   let participant = anchor.web3.Keypair.generate();
  //   participants.push(participant);
  // }

  async function airdropSol(publicKey, lamports = 1*LAMPORTS_PER_SOL) {
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(publicKey, lamports),
      "confirmed"
    );
  }

  async function initPlayer(payer: Keypair) {
    const [playerPda, playerBump] = PublicKey.findProgramAddressSync([Buffer.from("player"), payer.publicKey.toBuffer()], program.programId);
    const tx = await program.methods.initializePlayer().accounts({
      payer: payer.publicKey,
      player: playerPda
    }).signers([payer]).rpc()
    console.log("init player: ", tx)
    return [playerPda, playerBump] as const;
  }


  // Could only run once
  before('init vault', async () => {
    // const initVault = await program.methods.initializeVault().accounts({
    //   creator: host.publicKey,
    //   vault: vaultPda
    // }).rpc();
    // console.log("init vault tx:", initVault);

    // await program.account.vault.fetch(vaultPda).then((vault) => {
    //   console.log("vault:", vault)
    // })
  })

  it('init player: host', async () => {
    const hostPub = programProvider.wallet.publicKey;

    const [playerPda, playerBump] = PublicKey.findProgramAddressSync([Buffer.from("player"), hostPub.toBuffer()], program.programId);
    const tx = await program.methods.initializePlayer().accounts({
      payer: hostPub,
      player: playerPda
    }).rpc()

    const hostDeposit = await program.methods.depositToVault(new anchor.BN(10000000)).accounts({ 
      depositor: hostPub,
      vault: vaultPda,
      player: playerPda
    }).rpc();

    console.log("deposited to vault tx:", hostDeposit);

    const player = await program.account.player.fetch(playerPda);

    expect(player.balance.toNumber()).to.equal(10000000);
    expect(player.currentGame).to.equal(null);
    expect(player.games).to.equal(0);
  })

  it('reinit host player', async () => {

    const hostPub = programProvider.wallet.publicKey;
    const [playerPda, playerBump] = PublicKey.findProgramAddressSync([Buffer.from("player"), hostPub.toBuffer()], program.programId);
    const tx = await program.methods.initializePlayer().accounts({
      payer: hostPub,
      player: playerPda
    }).rpc()

    const host = await program.account.player.fetch(playerPda);
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

    // host is in the game now
    const game  = await program.methods.initializeGame(game_id).accounts({
      game: gamePda,
      payer: hostPub,
      host: hostPda
    }).rpc();

    console.log("init game tx: ", game)

    const host = await program.account.player.fetch(hostPda);
    expect(host.currentGame).to.equal(gamePda); 
    const gameState = await program.account.game.fetch(gamePda)
    expect(gameState.participants.length).to.equal(0);
    expect(gameState.status).equals({waitingForParticipants: {}})
  })

  const game_id = generateRandomString(8);
  const [gamePda, gameBump] = PublicKey.findProgramAddressSync([Buffer.from("game"), Buffer.from(game_id)], program.programId);
  before('a game', async () => {
    const [hostPda, hostBump] = PublicKey.findProgramAddressSync([Buffer.from("player"), host.publicKey.toBuffer()], program.programId);
    const game  = await program.methods.initializeGame(game_id).accounts({
      game: gamePda,
      payer: host.publicKey,
      host: hostPda
    }).rpc();

    
  })

  it('init & join player: 1', async () => {
    const player = await getKeypairFromFile('keypair1.json')
    // await airdropSol(player.publicKey);
    const [playerPda, _] = await initPlayer(player);

    const player1JoinGame = await program.methods.joinGame().accounts({
      payer: player.publicKey,
      player: playerPda,
      game: gamePda
    }).signers([player]).rpc()

    console.log("player 1 join game tx: ", player1JoinGame)

    const player1 = await program.account.player.fetch(playerPda);
    expect(player1.currentGame).to.equal(gamePda);
    const gameState = await program.account.game.fetch(gamePda)
    expect(gameState.participants.length).to.equal(1);
    expect(gameState.status).equals({WaitingForParticipants: {}})
  })

  it('init & join player: 2', async () => {
    const player = await getKeypairFromFile('keypair2.json')
    // await airdropSol(player.publicKey);
    const [playerPda, _] = await initPlayer(player);

    const player2JoinGame = await program.methods.joinGame().accounts({
      payer: player.publicKey,
      player: playerPda,
      game: gamePda
    }).signers([player]).rpc()

    console.log("player 2 join game tx: ", player2JoinGame)
    const player2 = await program.account.player.fetch(playerPda);
    expect(player2.currentGame).to.equal(gamePda);
    const gameState = await program.account.game.fetch(gamePda);
    expect(gameState.participants.length).to.equal(2);
    expect(gameState.status).equals({WaitingForParticipants: {}})
  })

    // Initialize the game

  it('start game', async () => {
    await program.methods.startGame().accounts({
      game: gamePda,
      host: host.publicKey
    }).rpc() 
    const gameState = await program.account.game.fetch(gamePda)
    expect(gameState.participants.length).to.equal(2);
    expect(gameState.status).equals({waitingForStory: {}})
  })

  it('submit story', async () => {
    const story = "Once upon a time...";
    await program.methods.submitStory(story).accounts({
      game: gamePda,
      host: host.publicKey
    }).rpc();
    // Verify the story was submitted
    const game = await program.account.game.fetch(gamePda);
    expect(game.story).to.equal(story);
    expect(game.status).to.equal({waitingForDrawings: {}})
  });

  it('player 1: submit drawing', async () => {
    const player = await getKeypairFromFile('keypair1.json')
    const drawingRef = `drawing_${1}`;
    await program.methods.submitDrawing(drawingRef).accounts({
      game: gamePda,
      participant: player.publicKey
    }).signers([player]).rpc()
    const game = await program.account.game.fetch(gamePda);
    expect(game.participants.length).to.equal(2);
    expect(game.drawings.length).to.equal(1);
    expect(game.status).to.equal({waitingForDrawings: {}})
  });

  it('player 2: submit drawing', async () => {
    const player = await getKeypairFromFile('keypair2.json')
    const drawingRef = `drawing_${2}`;
    await program.methods.submitDrawing(drawingRef).accounts({
      game: gamePda,
      participant: player.publicKey
    }).signers([player]).rpc()
    const game = await program.account.game.fetch(gamePda);
    expect(game.participants.length).to.equal(2);
    expect(game.drawings.length).to.equal(2);
    expect(game.status).to.equal({selectingWinner: {}})
  });

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
