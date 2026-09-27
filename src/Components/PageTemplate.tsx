"use client";

import React from "react";
import InfiniteMovieGrid from "./InfiniteMovieGrid";

import { Movie } from "../API/TMDB";

type Props = {
	genres?: string[]; // Optional now
	fetchStrategy?: (page: number) => Promise<Movie[]>;
	title?: string;
};

const PageTemplate: React.FC<Props> = ({ genres, fetchStrategy, title }) => {
	React.useEffect(() => {
		if (title) {
			document.title = title + " - DEMETR";
		}
	}, [title]);

	// For the infinite grid, we typically focus on one main genre or a mix.
	// If multiple genres are passed, we might pass the first one or handle it in the grid.
	const mainGenre = genres ? genres[0] : undefined;

	// Fallback: If no genre and no fetchStrategy, maybe default to "Popular"?
	// But specific pages will provide one or the other.

	return (
		<div className="min-h-screen bg-black animated-bg relative">
			{/* Main Content */}
			<div className="w-full">
				<InfiniteMovieGrid genre={mainGenre} fetchStrategy={fetchStrategy} />
			</div>

			{/* Footer is now inside the grid scroll or fixed? 
                If we want it at the bottom of the infinite list, it should be in the grid component or 
                we accept it might never be reached. 
                For now, let's keep it fixed or removing it effectively since infinite scroll makes footers hard.
				sounds good
            */}
		</div>
	);
};

export default PageTemplate;
