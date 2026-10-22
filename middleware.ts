import { auth } from '@/auth';

export default auth((req) => {
    if (!req.auth && req.nextUrl.pathname !== '/auth/signin') {
        const params = new URLSearchParams({
            callbackUrl: req.nextUrl.pathname + req.nextUrl.search,
        });
        const newUrl = new URL(`/auth/signin?${params.toString()}`, req.nextUrl.origin);
        return Response.redirect(newUrl);
    }
});

export const config = {
    matcher: ['/((?!api|auth|altes-portal|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpeg|.*\\.jpg|.*\\.svg|.*\\.webp).*)'],
};
