// @ts-ignore
import Lemmatize from "wink-lemmatizer";
function lemmatizeWord(word: string): string[] {
	const lowerWord = word.toLowerCase();
	const results: string[] = [word]; // Include the original word

	const nounLemma = Lemmatize.noun(lowerWord);
	if (nounLemma !== lowerWord) results.push(nounLemma);

	const verbLemma = Lemmatize.verb(lowerWord);
	if (verbLemma !== lowerWord) results.push(verbLemma);

	const adjectiveLemma = Lemmatize.adjective(lowerWord);
	if (adjectiveLemma !== lowerWord) results.push(adjectiveLemma);

	const lemmas = [...new Set(results)];
	return lemmas;
}

export { lemmatizeWord };
