import { Router } from 'express';
import { Match } from '../models/Match';
import { Tournament } from '../models/Tournament';

const router = Router();

router.post('/generate', async (req, res) => {
  try {
    const { tournamentId } = req.body;
    
    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }
    
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    if (tournament.status !== 'registration') {
      return res.status(400).json({ error: 'Cannot generate matches for this tournament' });
    }
    
    const expectedParticipants = tournament.mode === 'singles' ? 8 : 16;
    if (tournament.currentParticipants < expectedParticipants) {
      return res.status(400).json({ 
        error: `Need ${expectedParticipants} participants to start tournament` 
      });
    }
    
    await Tournament.findByIdAndUpdate(tournamentId, { status: 'in-progress' });
    
    res.json({ message: 'Matches generated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate matches' });
  }
});

router.get('/tournament/:tournamentId', async (req, res) => {
  try {
    const matches = await Match.find({ tournamentId: req.params.tournamentId })
      .populate('participant1 participant2 winner loser')
      .sort({ round: 1, bracketType: 1 });
    
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

router.patch('/:id/result', async (req, res) => {
  try {
    const { winnerId, loserId, score } = req.body;
    
    if (!winnerId || !loserId) {
      return res.status(400).json({ error: 'Winner and loser IDs are required' });
    }
    
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    if (match.completed) {
      return res.status(400).json({ error: 'Match already completed' });
    }
    
    const validParticipants = [match.participant1.toString(), match.participant2.toString()];
    if (!validParticipants.includes(winnerId) || !validParticipants.includes(loserId)) {
      return res.status(400).json({ error: 'Invalid winner or loser ID' });
    }
    
    match.winner = winnerId;
    match.loser = loserId;
    match.completed = true;
    
    if (score) {
      match.score = score;
    }
    
    await match.save();
    
    const updatedMatch = await Match.findById(req.params.id)
      .populate('participant1 participant2 winner loser');
    
    res.json(updatedMatch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update match result' });
  }
});

router.get('/bracket/:tournamentId', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId)
      .populate('bracketState.winners bracketState.losers');
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    const winnersMatches = await Match.find({
      tournamentId: req.params.tournamentId,
      bracketType: 'winners'
    }).populate('participant1 participant2 winner loser').sort({ round: 1 });
    
    const losersMatches = await Match.find({
      tournamentId: req.params.tournamentId,
      bracketType: 'losers'
    }).populate('participant1 participant2 winner loser').sort({ round: 1 });
    
    res.json({
      tournament,
      bracket: {
        winners: winnersMatches,
        losers: losersMatches
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bracket' });
  }
});

export default router;