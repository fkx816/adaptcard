export type RenderedCardSides = {
  prompt: string;
  answer: string;
};

function renderClozeText(source: string, targetIndex: number, revealTarget: boolean): string {
  return source.replace(/\{\{c(\d+)::(.+?)\}\}/g, (_match, indexRaw: string, content: string) => {
    const index = Number(indexRaw);
    if (!Number.isFinite(index) || index <= 0) {
      return content;
    }

    if (index === targetIndex) {
      return revealTarget ? content : "[...]";
    }

    return content;
  });
}

export function renderCardSides(cardType: string, front: string, back: string): RenderedCardSides {
  if (cardType === "reverse") {
    return {
      prompt: back,
      answer: front
    };
  }

  const clozeMatch = /^cloze:(\d+)$/.exec(cardType);
  if (clozeMatch) {
    const targetIndex = Number(clozeMatch[1]);
    const promptFront = renderClozeText(front, targetIndex, false);
    const promptBack = renderClozeText(back, targetIndex, false);
    const answerFront = renderClozeText(front, targetIndex, true);
    const answerBack = renderClozeText(back, targetIndex, true);

    return {
      prompt: `${promptFront}\n\n${promptBack}`.trim(),
      answer: `${answerFront}\n\n${answerBack}`.trim()
    };
  }

  return {
    prompt: front,
    answer: back
  };
}
