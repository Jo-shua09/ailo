import { Router } from "express";
import { eventsService } from "./events.service";

const router = Router();

router.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.flushHeaders?.();
  res.write(": connected\n\n");

  eventsService.addClient(res);

  req.on("close", () => {
    eventsService.removeClient(res);
  });
});

export default router;
