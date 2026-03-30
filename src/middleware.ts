import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: {
    signIn: "/login",
  },
})

export const config = {
  matcher: ["/dashboard/:path*", "/api/sync/:path*", "/api/dashboard/:path*", "/api/employees/:path*", "/api/activity/:path*", "/api/appointments/:path*", "/api/claims/:path*", "/api/production/:path*", "/api/timeclock/:path*"],
}
