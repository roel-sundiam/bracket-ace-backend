import { Router } from 'express';
import { Tournament } from '../models/Tournament';
import { Player } from '../models/Player';
import { Team } from '../models/Team';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name, mode } = req.body;
    
    if (!name || !mode) {
      return res.status(400).json({ error: 'Name and mode are required' });
    }
    
    const maxParticipants = mode === 'singles' ? 8 : 16;
    
    const tournament = new Tournament({
      name,
      mode,
      maxParticipants
    });
    
    await tournament.save();
    res.status(201).json(tournament);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

router.get('/', async (req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ createdAt: -1 });
    res.json(tournaments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

router.get('/:id/participants', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    if (tournament.mode === 'singles') {
      const players = await Player.find({ 
        mode: 'singles', 
        tournamentId: req.params.id 
      });
      res.json({ participants: players });
    } else {
      const teams = await Team.find({ tournamentId: req.params.id })
        .populate('player1Id player2Id');
      res.json({ participants: teams });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tournament status' });
  }
});

export default router;