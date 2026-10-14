import { analyzeWriting, type HintTask } from '@/lib/writing-hints';

type HintRequest = { revision: number; text: string; task: HintTask };
const worker = globalThis as unknown as {
  onmessage: ((event: MessageEvent<HintRequest>) => void) | null;
  postMessage: (value: unknown) => void;
};
worker.onmessage = ({ data }) => {
  worker.postMessage({
    revision: data.revision,
    hints: analyzeWriting(data.text, data.task),
  });
};
