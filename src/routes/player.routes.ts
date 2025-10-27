import { Router } from 'express';
import { Player } from '../models/Player';
import { Team } from '../models/Team';
import { Tournament } from '../models/Tournament';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name, mode, tournamentId } = req.body;
    
    if (!name || !mode || !tournamentId) {
      return res.status(400).json({ error: 'Name, mode, and tournamentId are required' });
    }
    
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    if (tournament.mode !== mode) {
      return res.status(400).json({ error: 'Player mode must match tournament mode' });
    }
    
    if (tournament.status !== 'registration') {
      return res.status(400).json({ error: 'Tournament registration is closed' });
    }
    
    const maxPlayers = mode === 'singles' ? 8 : 16;
    const currentPlayers = await Player.countDocuments({ mode, tournamentId });
    
    if (currentPlayers >= maxPlayers) {
      return res.status(400).json({ error: 'Tournament is full' });
    }
    
    const player = new Player({ name, mode, tournamentId });
    await player.save();
    
    await Tournament.findByIdAndUpdate(tournamentId, {
      $inc: { currentParticipants: 1 }
    });
    
    res.status(201).json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to register player' });
  }
});

router.post('/team', async (req, res) => {
  try {
    const { name, player1Name, player2Name, tournamentId } = req.body;
    
    if (!name || !player1Name || !player2Name || !tournamentId) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    if (tournament.mode !== 'doubles') {
      return res.status(400).json({ error: 'Teams can only be created for doubles tournaments' });
    }
    
    if (tournament.status !== 'registration') {
      return res.status(400).json({ error: 'Tournament registration is closed' });
    }
    
    const currentTeams = await Team.countDocuments({ tournamentId });
    if (currentTeams >= 8) {
      return res.status(400).json({ error: 'Tournament is full (8 teams max)' });
    }
    
    const player1 = new Player({ name: player1Name, mode: 'doubles', tournamentId });
    const player2 = new Player({ name: player2Name, mode: 'doubles', tournamentId });
    
    await player1.save();
    await player2.save();
    
    const team = new Team({
      name,
      player1Id: player1._id,
      player2Id: player2._id,
      tournamentId
    });
    
    await team.save();
    
    player1.teamId = team._id;
    player2.teamId = team._id;
    
    await player1.save();
    await player2.save();
    
    await Tournament.findByIdAndUpdate(tournamentId, {
      $inc: { currentParticipants: 2 }
    });
    
    const populatedTeam = await Team.findById(team._id)
      .populate('player1Id player2Id');
    
    res.status(201).json(populatedTeam);
  } catch (error) {
    res.status(500).json({ error: 'Failed to register team' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { mode } = req.query;
    const filter = mode ? { mode } : {};
    const players = await Player.find(filter).populate('teamId');
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

export default router;