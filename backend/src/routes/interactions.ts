/**
 * Interaction Signals Router
 *
 * Endpoints for recording user interactions with recipes
 * to enable taste learning and personalization.
 */

import { Router, type Response } from 'express';
import { applyInteractionSignal, type InteractionSignal } from '../recipes/taste';

const router = Router();

/**
 * POST /api/interactions/signal
 * Record a user interaction (cooked, skipped, thumbs_up, etc.)
 */
router.post('/signal', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { recipeId, signalType, metadata } = req.body || {};

    if (!recipeId || typeof recipeId !== 'string') {
      return res.status(400).json({ message: 'recipeId is required' });
    }

    const validSignals = ['cooked', 'skipped', 'thumbs_up', 'thumbs_down', 'repeated', 'edited'];
    if (!signalType || !validSignals.includes(signalType)) {
      return res.status(400).json({
        message: `signalType must be one of: ${validSignals.join(', ')}`,
      });
    }

    const signal: InteractionSignal = {
      userId,
      recipeId,
      signalType,
      metadata: typeof metadata === 'object' ? metadata : undefined,
    };

    req.log.info(
      { action: 'interaction_signal', signalType, recipeId },
      'Recording interaction signal'
    );

    await applyInteractionSignal(signal);

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err, action: 'interaction_signal' }, 'Failed to record interaction');
    return res.status(500).json({ message: 'Failed to record interaction' });
  }
});

/**
 * POST /api/interactions/cooked
 * Shorthand for marking a recipe as cooked
 */
router.post('/cooked', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { recipeId } = req.body || {};
    if (!recipeId) {
      return res.status(400).json({ message: 'recipeId is required' });
    }

    await applyInteractionSignal({
      userId,
      recipeId,
      signalType: 'cooked',
    });

    req.log.info({ action: 'recipe_cooked', recipeId }, 'Recipe marked as cooked');

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err, action: 'recipe_cooked' }, 'Failed to mark recipe as cooked');
    return res.status(500).json({ message: 'Failed to record interaction' });
  }
});

/**
 * POST /api/interactions/thumbs
 * Record thumbs up or down
 */
router.post('/thumbs', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { recipeId, up } = req.body || {};
    if (!recipeId) {
      return res.status(400).json({ message: 'recipeId is required' });
    }

    const signalType = up === true ? 'thumbs_up' : 'thumbs_down';

    await applyInteractionSignal({
      userId,
      recipeId,
      signalType,
    });

    req.log.info({ action: 'recipe_thumbs', recipeId, up }, 'Recipe feedback recorded');

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err, action: 'recipe_thumbs' }, 'Failed to record thumbs feedback');
    return res.status(500).json({ message: 'Failed to record feedback' });
  }
});

/**
 * POST /api/interactions/skip
 * Record that user skipped/dismissed a recipe suggestion
 */
router.post('/skip', async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { recipeId } = req.body || {};
    if (!recipeId) {
      return res.status(400).json({ message: 'recipeId is required' });
    }

    await applyInteractionSignal({
      userId,
      recipeId,
      signalType: 'skipped',
    });

    req.log.info({ action: 'recipe_skipped', recipeId }, 'Recipe skipped');

    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err, action: 'recipe_skipped' }, 'Failed to record skip');
    return res.status(500).json({ message: 'Failed to record interaction' });
  }
});

export default router;
