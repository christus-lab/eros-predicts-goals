import { createServerFn } from "@tanstack/react-start";
import type { LiveInput } from "./eros-live.server";

export const predictLive = createServerFn({ method: "POST" })
  .inputValidator((input: LiveInput) => input)
  .handler(async ({ data }) => {
    const { runLiveAnalysis } = await import("./eros-live.server");
    return runLiveAnalysis(data);
  });
