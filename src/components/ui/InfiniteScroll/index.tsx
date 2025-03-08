/* eslint-disable react/display-name */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

interface InfiniteScrollProps extends React.HTMLAttributes<HTMLDivElement> {
	fetchNextPage: () => Promise<any>;
	hasNextPage: boolean;
	loadingMessage: React.ReactNode;
	endingMessage: React.ReactNode;
}

const InfiniteScroller = React.forwardRef<HTMLDivElement, InfiniteScrollProps>(
	({ fetchNextPage, hasNextPage, endingMessage, loadingMessage, children, ...props }, ref) => {
		const observerTarget = React.useRef(null);

		React.useEffect(() => {
			const observer = new IntersectionObserver(
				(entries) => {
					if (entries[0]?.isIntersecting && hasNextPage) fetchNextPage();
				},
				{ threshold: 1 }
			);

			if (observerTarget.current) {
				observer.observe(observerTarget.current);
			}

			return () => observer.disconnect();
		}, [hasNextPage]);

		return (
			<div ref={ref} {...props}>
				{children}
				{hasNextPage ? loadingMessage : endingMessage}
				<div ref={observerTarget} />
			</div>
		);
	}
);

export default InfiniteScroller;
