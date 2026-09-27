"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from 'next/image';
import { useRouter } from "next/navigation";
import { getImageURL, Movie, getMovieVideos, getMovieById, MovieDetails } from "../API/TMDB";
import { getOMDBRatings, OMDBRatings } from "../API/OMDBActions";
import LazyImage from "./LazyImage";
import Button from "./Button";
import TrailerModal from "./TrailerModal";
import RatingCard from "./RatingCard";

type Props = {
    movies: Movie[];
    className?: string;
};

const HorizontalMovieCard: React.FC<Props> = ({ movies, className = "" }) => {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [trailerKey, setTrailerKey] = useState<string | null>(null);
    const [showTrailer, setShowTrailer] = useState(false);

    const [currentMovieParams, setCurrentMovieParams] = useState<{ details: MovieDetails | null, ratings: OMDBRatings | null }>({ details: null, ratings: null });

    const fetchMovieData = useCallback(async (id: number) => {
        try {
            setCurrentMovieParams({ details: null, ratings: null });
            const details = await getMovieById(id);
            if (details) {
                const ratings = details.imdb_id ? await getOMDBRatings(details.imdb_id) : null;
                setCurrentMovieParams({ details, ratings });
            }
        } catch (e) {
            console.error("Failed to fetch movie data", e);
        }
    }, []);

    const fetchTrailer = useCallback(async (id: number) => {
        const videos = await getMovieVideos(id);
        const trailer = videos.results?.find((v: { type: string; site: string; key: string }) => v.type === "Trailer" && v.site === "YouTube");
        setTrailerKey(trailer?.key || null);
    }, []);

    useEffect(() => {
        if (movies[currentIndex]) {
            const id = movies[currentIndex].id;
            fetchTrailer(id);
            fetchMovieData(id);
        }
    }, [currentIndex, movies, fetchTrailer, fetchMovieData]);

    const handleMoreClick = (id: number) => {
        router.push(`/movie/${id}`);
    };

    const handleTrailerClick = () => {
        if (trailerKey) {
            setShowTrailer(true);
        }
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
    };

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, [movies.length]);

    // Auto-rotate every 10 seconds
    useEffect(() => {
        if (movies.length <= 1) return;
        // Pause auto-rotation if trailer is open
        if (showTrailer) return;

        const interval = setInterval(handleNext, 10000);
        return () => clearInterval(interval);
    }, [movies.length, handleNext, showTrailer]);

    // Swipe Support
    const minSwipeDistance = 50;
    const clickTolerance = 10;
    const dragStartX = useRef<number | null>(null);
    const dragDeltaX = useRef(0);
    const didDrag = useRef(false);

    const getClientX = (e: React.TouchEvent | React.MouseEvent) =>
        'touches' in e ? e.touches[0].clientX : e.clientX;

    const onDragStart = (e: React.TouchEvent | React.MouseEvent) => {
        if (showTrailer) return;
        dragStartX.current = getClientX(e);
        dragDeltaX.current = 0;
        didDrag.current = false;
    };

    const onDragMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (dragStartX.current === null) return;
        dragDeltaX.current = getClientX(e) - dragStartX.current;
        if (Math.abs(dragDeltaX.current) > clickTolerance) didDrag.current = true;
    };

    const onDragEnd = () => {
        if (dragStartX.current === null) return;
        dragStartX.current = null;
        if (dragDeltaX.current < -minSwipeDistance) {
            handleNext();
        } else if (dragDeltaX.current > minSwipeDistance) {
            handlePrev();
        }
    };

    // Click only fires on the details container when the press started and was released inside it
    const handleDetailsClick = (e: React.MouseEvent, id: number) => {
        if (didDrag.current) return;
        if ((e.target as HTMLElement).closest('a')) return; // rating links open in a new tab
        handleMoreClick(id);
    };

    return (
        <div
            className={`relative w-full h-screen overflow-hidden bg-black group ${className}`}
            onTouchStart={onDragStart}
            onTouchMove={onDragMove}
            onTouchEnd={onDragEnd}
            onMouseDown={onDragStart}
            onMouseMove={onDragMove}
            onMouseUp={onDragEnd}
            onMouseLeave={onDragEnd}
        >
            {/* Carousel Track */}
            <div
                className="flex h-full transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {movies.map((movie, index) => {
                    const backdropUrl = movie.backdrop_path ? getImageURL(movie.backdrop_path, 'max') : '';
                    const posterUrl = movie.poster_path ? getImageURL(movie.poster_path, 'mid') : '';

                    return (
                        <div key={movie.id} className="relative min-w-full h-full select-none">
                            {/* Background Image - Mobile (Poster) */}
                            {posterUrl && (
                                <div className="absolute inset-0 block md:hidden">
                                    <Image
                                        src={posterUrl}
                                        alt={movie.title}
                                        fill
                                        className="object-cover opacity-50 pointer-events-none"
                                        priority={index === 0}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                                </div>
                            )}

                            {/* Background Image - Desktop (Backdrop) */}
                            {backdropUrl && (
                                <div className="absolute inset-0 hidden md:block">
                                    <Image
                                        src={backdropUrl}
                                        alt={movie.title}
                                        fill
                                        className="object-cover opacity-60 pointer-events-none"
                                        priority={index === 0}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent"></div>
                                </div>
                            )}

                            {/* Content Container */}
                            <div className="absolute inset-0 flex items-end pb-24 md:items-center md:pb-0 px-6 md:px-16 container mx-auto pointer-events-none">
                                <div className="flex flex-col md:flex-row items-start md:items-end gap-6 md:gap-8 w-full">

                                    {/* Vertical Poster - Hidden on mobile, visible on desktop */}
                                    <div className="hidden md:block relative w-48 lg:w-64 aspect-[2/3] rounded-lg shadow-2xl overflow-hidden flex-shrink-0">
                                        {posterUrl && (
                                            <LazyImage
                                                src={posterUrl}
                                                placeholderSrc={getImageURL(movie.poster_path, 'tiny')}
                                                alt={movie.title + " Poster"}
                                                fill
                                                className="object-cover"
                                            />
                                        )}
                                    </div>

                                    {/* Text Details */}
                                    <div
                                        className="text-white max-w-2xl mb-4 md:mb-0 pointer-events-auto cursor-pointer"
                                        onClick={(e) => handleDetailsClick(e, movie.id)}
                                    >
                                        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-2 md:mb-4 tracking-tight drop-shadow-lg">
                                            {movie.title}
                                        </h1>
                                        <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm md:text-base font-medium text-white/80 mb-4 md:mb-6">
                                            <RatingCard
                                                type="TMDB"
                                                value={`${(movie.vote_average * 10).toFixed(0)}%`}
                                                link={`https://www.themoviedb.org/movie/${movie.id}`}
                                            />
                                            {index === currentIndex && currentMovieParams.details && currentMovieParams.ratings && (
                                                <>
                                                    {currentMovieParams.ratings.imdb && (
                                                        <RatingCard
                                                            type="IMDb"
                                                            value={currentMovieParams.ratings.imdb}
                                                            link={`https://www.imdb.com/title/${currentMovieParams.details.imdb_id}`}
                                                        />
                                                    )}
                                                    {currentMovieParams.ratings.rottenTomatoes && (
                                                        <RatingCard
                                                            type="RottenTomatoes"
                                                            value={currentMovieParams.ratings.rottenTomatoes}
                                                            link={`https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.title)}`}
                                                        />
                                                    )}
                                                    {currentMovieParams.ratings.metacritic && (
                                                        <RatingCard
                                                            type="Metacritic"
                                                            value={currentMovieParams.ratings.metacritic}
                                                            link={`https://www.metacritic.com/search/${encodeURIComponent(movie.title)}`}
                                                        />
                                                    )}
                                                </>
                                            )}

                                            <span className="text-white/40">•</span>
                                            <span className="text-white/60 text-sm font-medium">{movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}</span>
                                            <span className="text-white/40">•</span>
                                            <span className="uppercase tracking-wider text-[10px] md:text-xs border border-white/30 px-2 py-1 rounded text-white/60">
                                                {movie.original_language}
                                            </span>
                                        </div>
                                        <p className="text-sm md:text-lg text-white/70 line-clamp-3 md:line-clamp-4 leading-relaxed max-w-xl mb-6 md:mb-8 drop-shadow-md">
                                            {movie.overview}
                                        </p>

                                        <div className="flex w-full justify-end md:justify-start gap-4">
                                            {trailerKey && (
                                                <Button
                                                    onClick={(e) => { e.stopPropagation(); if (!didDrag.current) handleTrailerClick(); }}
                                                    variant="secondary"
                                                    size="md"
                                                    className="rounded-full backdrop-blur-md border-white/20 bg-white/10 hover:bg-white/20"
                                                    icon={
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                    }
                                                >
                                                    Watch Trailer
                                                </Button>
                                            )}
                                            <Button
                                                variant="secondary"
                                                size="md"
                                                className="hidden md:inline-flex"
                                                icon={
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                }
                                            >
                                                More
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Edge Gradients */}
            <div className="hidden md:block absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black/80 to-transparent pointer-events-none z-10" />
            <div className="hidden md:block absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black/80 to-transparent pointer-events-none z-10" />

            {/* Arrow Navigation */}
            <button
                onClick={(e) => { e.stopPropagation(); if (!showTrailer) handlePrev(); }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 text-white/50 hover:text-white transition-colors p-4 hidden md:block"
            >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); if (!showTrailer) handleNext(); }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 text-white/50 hover:text-white transition-colors p-4 hidden md:block"
            >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                </svg>
            </button>

            {/* Indicators */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex gap-2 z-30">
                {movies.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`h-1 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/30 hover:bg-white/60'}`}
                    />
                ))}
            </div>

            {/* Trailer Modal */}
            {trailerKey && showTrailer && (
                <TrailerModal
                    trailerKey={trailerKey}
                    isOpen={showTrailer}
                    onClose={() => setShowTrailer(false)}
                />
            )}
        </div>
    );
};

export default HorizontalMovieCard;
