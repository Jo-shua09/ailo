import { env } from "../../config/env";
import { koraRail } from "./kora";
import { simulatedRail } from "./simulated";
import type { PayoutRail } from "./rails.interface";

export * from "./rails.interface";
export * from "./kora";
export * from "./simulated";

export function getPayoutRail(): PayoutRail {
  if (env.KORA_MODE === "simulated") {
    return simulatedRail;
  }
  if ((env.KORA_MODE === "test" || env.KORA_MODE === "live") && env.KORA_SECRET_KEY && env.NODE_ENV !== "test") {
    return koraRail;
  }
  return simulatedRail;
}
