"use client"

import { Header } from "@/components/layout/header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useAuth as useClerkAuth, useUser } from "@clerk/nextjs"
import { motion } from "framer-motion"
import {
    ArrowDown,
    ArrowRight,
    ArrowUpRight,
    BarChart,
    CheckCircle2,
    ChevronRight,
    Code,
    Database,
    FileText,
    Globe,
    Layers,
    Lock,
    Settings,
    Shield,
    Sparkles,
    Star,
    Users,
    Workflow,
    Zap
} from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState("hero")
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null)
  const { theme, setTheme } = useTheme()
  const heroRef = useRef<HTMLElement>(null)
  const featuresRef = useRef<HTMLElement>(null)
  const howItWorksRef = useRef<HTMLElement>(null)
  const testimonialsRef = useRef<HTMLElement>(null)
  const pricingRef = useRef<HTMLElement>(null)
  const { user, isLoaded } = useUser()
  const { signOut } = useClerkAuth()
  const { toast } = useToast()
  const loading = !isLoaded

  // Handle scroll events
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)

      // Determine active section
      const scrollPosition = window.scrollY + 100

      const sections = [
        { id: "hero", ref: heroRef },
        { id: "features", ref: featuresRef },
        { id: "how-it-works", ref: howItWorksRef },
        { id: "testimonials", ref: testimonialsRef },
        { id: "pricing", ref: pricingRef },
      ] as const

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i]
        const element = section.ref.current
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(section.id)
          break
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Parallax effect for hero section
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  // Handle plan selection and checkout
  const handlePlanSelect = async (planId: string) => {
    // If user is not logged in, redirect to signup
    if (!user) {
      window.location.href = '/signup';
      return;
    }

    try {
      setIsCheckoutLoading(planId);
      
      // Call the API to create a checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to the checkout URL
      window.location.href = url;
    } catch (error) {
      console.error('Error initiating checkout:', error);
      toast({
        title: 'Checkout Error',
        description: error instanceof Error ? error.message : 'Failed to start checkout process',
        variant: 'destructive',
      });
    } finally {
      setIsCheckoutLoading(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-background to-background/80 selection:bg-primary/20 selection:text-primary">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-grid-small-black/[0.03] dark:bg-grid-small-white/[0.03] -z-10" />

        {/* Animated gradient background */}
        <div
          className="absolute top-0 -right-40 -z-10 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl animate-pulse"
          style={{
            transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px)`,
            opacity: 0.7 + mousePosition.y * 0.3,
          }}
        />
        <div
          className="absolute -bottom-40 -left-40 -z-10 h-[600px] w-[600px] rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-3xl animate-pulse"
          style={{
            animationDelay: "1s",
            transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -20}px)`,
          }}
        />

        <div className="container px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-6"
            >
              <Badge className="w-fit group" variant="outline">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="inline-flex items-center"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
                  <span>AI-Powered Document Processing</span>
                </motion.span>
              </Badge>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                Extract data from{" "}
                <span className="text-primary relative inline-block">
                  documents
                  <motion.svg
                    aria-hidden="true"
                    viewBox="0 0 418 42"
                    className="absolute top-full left-0 h-[0.58em] w-full fill-primary/40"
                    preserveAspectRatio="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                  >
                    <path d="M203.371.916c-26.013-2.078-76.686 1.963-124.73 9.946L67.3 12.749C35.421 18.062 18.2 21.766 6.004 25.934 1.244 27.561.828 27.778.874 28.61c.07 1.214.828 1.121 9.595-1.176 9.072-2.377 17.15-3.92 39.246-7.496C123.565 7.986 157.869 4.492 195.942 5.046c7.461.108 19.25 1.696 19.17 2.582-.107 1.183-7.874 4.31-25.75 10.366-21.992 7.45-35.43 12.534-36.701 13.884-2.173 2.308-.202 4.407 4.442 4.734 2.654.187 3.263.157 15.593-.78 35.401-2.686 57.944-3.488 88.365-3.143 46.327.526 75.721 2.23 130.788 7.584 19.787 1.924 20.814 1.98 24.557 1.332l.066-.011c1.201-.203 1.53-1.825.399-2.335-2.911-1.31-4.893-1.604-22.048-3.261-57.509-5.556-87.871-7.36-132.059-7.842-23.239-.254-33.617-.116-50.627.674-11.629.54-42.371 2.494-46.696 2.967-2.359.259 8.133-3.625 26.504-9.81 23.239-7.825 27.934-10.149 28.304-14.005.417-4.348-3.529-6-16.878-7.066Z" />
                  </motion.svg>
                </span>{" "}
                in seconds
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="max-w-[600px] text-lg text-muted-foreground md:text-xl"
              >
                Stop wasting time on manual data entry. Our AI automatically extracts, structures, and validates data
                from any document type with <span className="font-semibold text-primary">99% accuracy</span>.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 pt-4"
              >
                <Button size="lg" className="h-12 px-8 group relative overflow-hidden" asChild>
                  <Link href={user ? "/dashboard" : "/signup"}>
                    <span className="relative z-10 flex items-center">
                      {user ? "Go to Dashboard" : "Get Started Now"}
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                    <span className="absolute inset-0 bg-white/20 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8 group" asChild>
                  <Link href="#demo">
                    <span className="flex items-center">
                      Watch demo
                      <svg
                        className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5.5 3.5L10.5 8L5.5 12.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </Link>
                </Button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-8 pt-4"
              >
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="h-8 w-8 rounded-full border-2 border-background bg-muted overflow-hidden hover:scale-125 hover:z-10 transition-all duration-300"
                      style={{ zIndex: 4 - i }}
                    >
                      <img
                        src={`/landing/avatar${i}.jpg`}
                        alt={`User ${i}`}
                        className="h-full w-full object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
                <div className="text-sm">
                  <span className="font-medium">1,000+ companies</span>
                  <span className="text-muted-foreground"> trust Ingestio.io</span>
                </div>
              </motion.div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
              style={{
                transform: `translate(${mousePosition.x * -10}px, ${mousePosition.y * -10}px)`,
              }}
            >
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-primary/20 to-primary/40 blur-xl opacity-70 animate-pulse" />
              <div className="relative bg-card rounded-xl border shadow-xl overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-12 bg-muted/80 backdrop-blur-sm flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <div className="text-xs font-medium">Ingestio.io Dashboard</div>
                </div>
                <img 
                  src="/landing/hero_dashboard.png" 
                  alt="Ingestio.io AI Document Data Extraction Dashboard" 
                  className="w-full h-auto object-cover rounded-b-xl"
                  style={{ 
                    transformOrigin: "center center",
                    transform: `scale(1.02) translate(${mousePosition.x * 5}px, ${mousePosition.y * 5}px)`, 
                    transition: "transform 0.2s ease-out"
                  }}
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
        >
          <span className="text-xs text-muted-foreground mb-2">Scroll to explore</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}>
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </motion.div>

        {/* Logos */}
        <div className="container mt-20">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-sm font-medium text-muted-foreground mb-6"
          >
            TRUSTED BY INNOVATIVE TECH STARTUPS
          </motion.p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-8">
            {[
              { id: 1, name: "Acme Inc" },
              { id: 2, name: "TechCorp" },
              { id: 3, name: "Innovex" },
              { id: 4, name: "DataFlow" }
            ].map((company) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + company.id * 0.1 }}
                className="h-14 transition-all filter grayscale hover:filter-none hover:-translate-y-1 duration-300"
              >
                <img
                  src={`/landing/company${company.id}.png`}
                  alt={`${company.name} logo`}
                  className="h-full w-auto object-contain opacity-80 hover:opacity-100 transition-opacity shadow-sm hover:shadow-md rounded-md p-1"
                  width={120}
                  height={48}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} id="features" className="py-24 relative">
        <div className="absolute inset-0 bg-grid-small-black/[0.03] dark:bg-grid-small-white/[0.03] -z-10" />
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16 max-w-3xl mx-auto"
          >
            <Badge className="mb-4" variant="outline">
              <span className="inline-flex items-center">
                <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
                <span>Features</span>
              </span>
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
              Everything you need for document processing
            </h2>
            <p className="text-lg text-muted-foreground">
              Our platform combines powerful AI with an intuitive interface to make document processing effortless
            </p>
          </motion.div>

          <Tabs defaultValue="extract" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-12 relative">
              <TabsTrigger
                value="extract"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Zap className="h-4 w-4 mr-2" />
                Extract
              </TabsTrigger>
              <TabsTrigger
                value="process"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <BarChart className="h-4 w-4 mr-2" />
                Process
              </TabsTrigger>
              <TabsTrigger
                value="integrate"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Globe className="h-4 w-4 mr-2" />
                Integrate
              </TabsTrigger>
            </TabsList>

            <TabsContent value="extract" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid lg:grid-cols-2 gap-12 items-center"
              >
                <div className="order-2 lg:order-1">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      <Zap className="h-4 w-4" />
                      Instant Extraction
                    </div>
                    <h3 className="text-2xl font-bold">Extract data from any document type</h3>
                    <p className="text-muted-foreground">
                      Our AI can process invoices, receipts, contracts, forms, and more with industry-leading accuracy.
                    </p>

                    <ul className="space-y-4 pt-4">
                      {[
                        {
                          title: "99% Accuracy",
                          description: "Advanced AI models trained on millions of documents",
                          icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
                        },
                        {
                          title: "Multiple Document Types",
                          description: "PDFs, images, scans, and even handwritten documents",
                          icon: <Layers className="h-5 w-5 text-primary" />,
                        },
                        {
                          title: "Structured Output",
                          description: "Get clean, structured data ready for your systems",
                          icon: <Database className="h-5 w-5 text-primary" />,
                        },
                      ].map((item, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex gap-3"
                        >
                          <div className="rounded-full p-1 bg-primary/10">{item.icon}</div>
                          <div>
                            <h4 className="font-medium">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="relative order-1 lg:order-2">
                  <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/20 to-primary/30 blur-xl opacity-70" />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative bg-card rounded-xl border shadow-xl overflow-hidden"
                    whileHover={{ 
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                    }}
                  >
                    <img
                      src="/landing/document-extraction.jpg"
                      alt="Document Extraction"
                      className="w-full h-auto object-cover rounded-xl hover:scale-105 transition-transform duration-500"
                      width={600}
                      height={400}
                      style={{
                        transformOrigin: "center center",
                        transform: `scale(1.01) translate(${mousePosition.x * 15}px, ${mousePosition.y * 15}px)`,
                        transition: "transform 0.2s ease-out"
                      }}
                    />
                  </motion.div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="process" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid lg:grid-cols-2 gap-12 items-center"
              >
                <div className="order-2 lg:order-1">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      <BarChart className="h-4 w-4" />
                      Smart Processing
                    </div>
                    <h3 className="text-2xl font-bold">Process and validate with confidence</h3>
                    <p className="text-muted-foreground">
                      Our platform doesn't just extract data—it understands it, validates it, and prepares it for your
                      workflows.
                    </p>

                    <ul className="space-y-4 pt-4">
                      {[
                        {
                          title: "Automatic Validation",
                          description: "Built-in checks to ensure data accuracy",
                          icon: <Shield className="h-5 w-5 text-primary" />,
                        },
                        {
                          title: "Data Enrichment",
                          description: "Enhance extracted data with additional context",
                          icon: <Workflow className="h-5 w-5 text-primary" />,
                        },
                        {
                          title: "Custom Rules",
                          description: "Define your own validation and processing rules",
                          icon: <Settings className="h-5 w-5 text-primary" />,
                        },
                      ].map((item, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex gap-3"
                        >
                          <div className="rounded-full p-1 bg-primary/10">{item.icon}</div>
                          <div>
                            <h4 className="font-medium">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="relative order-1 lg:order-2">
                  <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/20 to-primary/30 blur-xl opacity-70" />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative bg-card rounded-xl border shadow-xl overflow-hidden"
                    whileHover={{ 
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                    }}
                  >
                    <img
                      src="/landing/data-processing.jpg"
                      alt="Data Processing"
                      className="w-full h-auto object-cover rounded-xl hover:scale-105 transition-transform duration-500"
                      width={600}
                      height={400}
                      style={{
                        transformOrigin: "center center",
                        transform: `scale(1.01) translate(${mousePosition.x * 15}px, ${mousePosition.y * 15}px)`,
                        transition: "transform 0.2s ease-out"
                      }}
                    />
                  </motion.div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="integrate" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid lg:grid-cols-2 gap-12 items-center"
              >
                <div className="order-2 lg:order-1">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      <Globe className="h-4 w-4" />
                      Seamless Integration
                    </div>
                    <h3 className="text-2xl font-bold">Connect with your existing tools</h3>
                    <p className="text-muted-foreground">
                      Ingestio.io integrates with your favorite tools and platforms to create a seamless workflow.
                    </p>

                    <ul className="space-y-4 pt-4">
                      {[
                        {
                          title: "API Access",
                          description: "Powerful REST API for custom integrations",
                          icon: <Code className="h-5 w-5 text-primary" />,
                        },
                        {
                          title: "Pre-built Connectors",
                          description: "Connect with Zapier, Salesforce, QuickBooks, and more",
                          icon: <Workflow className="h-5 w-5 text-primary" />,
                        },
                        {
                          title: "Webhooks",
                          description: "Trigger actions in other systems automatically",
                          icon: <Zap className="h-5 w-5 text-primary" />,
                        },
                      ].map((item, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex gap-3"
                        >
                          <div className="rounded-full p-1 bg-primary/10">{item.icon}</div>
                          <div>
                            <h4 className="font-medium">{item.title}</h4>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="relative order-1 lg:order-2">
                  <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/20 to-primary/30 blur-xl opacity-70" />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative bg-card rounded-xl border shadow-xl overflow-hidden"
                    whileHover={{ 
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                    }}
                  >
                    <img
                      src="/landing/integration.jpg"
                      alt="Integration"
                      className="w-full h-auto object-cover rounded-xl hover:scale-105 transition-transform duration-500"
                      width={600}
                      height={400}
                      style={{
                        transformOrigin: "center center",
                        transform: `scale(1.01) translate(${mousePosition.x * 15}px, ${mousePosition.y * 15}px)`,
                        transition: "transform 0.2s ease-out"
                      }}
                    />
                  </motion.div>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Feature cards */}
          <div className="mt-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h3 className="text-2xl font-bold mb-4">More powerful features</h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Discover all the tools you need to streamline your document processing workflow
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Batch Processing",
                  description:
                    "Process thousands of documents simultaneously with our powerful batch processing engine.",
                  icon: <Layers className="h-5 w-5 text-primary" />,
                },
                {
                  title: "Custom Templates",
                  description: "Create custom extraction templates for your specific document types and formats.",
                  icon: <FileText className="h-5 w-5 text-primary" />,
                },
                {
                  title: "Advanced OCR",
                  description: "Extract text from any document, including scanned images and handwritten notes.",
                  icon: <Zap className="h-5 w-5 text-primary" />,
                },
                {
                  title: "Data Validation",
                  description: "Ensure accuracy with built-in validation rules and error detection.",
                  icon: <Shield className="h-5 w-5 text-primary" />,
                },
                {
                  title: "Team Collaboration",
                  description: "Work together with your team to review and approve extracted data.",
                  icon: <Users className="h-5 w-5 text-primary" />,
                },
                {
                  title: "Audit Trails",
                  description: "Keep track of all document processing activities with detailed audit logs.",
                  icon: <Database className="h-5 w-5 text-primary" />,
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
                        <CardContent className="p-6 flex flex-col h-full">
                          <div className="rounded-full w-10 h-10 bg-primary/10 flex items-center justify-center mb-4">
                            {feature.icon}
                          </div>
                          <h4 className="text-lg font-medium mb-2">{feature.title}</h4>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </CardContent>
                      </Card>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="flex justify-between space-x-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">{feature.title}</h4>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                          <div className="flex items-center pt-2">
                            <Button variant="link" className="h-8 p-0 text-primary" asChild>
                              <Link href="#" className="flex items-center">
                                Learn more
                                <ArrowRight className="ml-1 h-3 w-3" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section ref={howItWorksRef} id="how-it-works" className="py-24 bg-muted/30 dark:bg-muted/10 relative overflow-hidden" >
        <div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -z-10 h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-3xl" />

        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16 max-w-3xl mx-auto"
          >
            <Badge className="mb-4" variant="outline">
              <span className="inline-flex items-center">
                <Workflow className="h-3.5 w-3.5 mr-1 text-primary" />
                <span>How It Works</span>
              </span>
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
              Three simple steps to automate your workflow
            </h2>
            <p className="text-lg text-muted-foreground">
              Our platform makes document processing effortless from start to finish
            </p>
          </motion.div>

          <div className="relative">
            {/* Connection line */}
            <div className="absolute top-24 left-1/2 h-[calc(100%-6rem)] w-0.5 bg-border -translate-x-1/2 hidden md:block" />

            <div className="grid md:grid-cols-3 gap-8 relative">
              {[
                {
                  step: 1,
                  title: "Upload Documents",
                  description: "Drag and drop your documents or connect to cloud storage for automatic importing.",
                  features: [
                    "Support for PDFs, images, and scans",
                    "Batch upload for multiple documents",
                    "Secure and encrypted storage",
                  ],
                },
                {
                  step: 2,
                  title: "AI Processing",
                  description: "Our AI automatically extracts, classifies, and validates data from your documents.",
                  features: [
                    "Advanced OCR and machine learning",
                    "Automatic field detection and mapping",
                    "Data validation and error correction",
                  ],
                },
                {
                  step: 3,
                  title: "Export & Integrate",
                  description: "Review the extracted data and export it to your preferred format or system.",
                  features: [
                    "Export to CSV, JSON, Excel, and more",
                    "Direct integration with business systems",
                    "Automated workflows with webhooks",
                  ],
                },
              ].map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="bg-background rounded-xl p-6 border shadow-sm relative z-10 group hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <div className="rounded-full w-12 h-12 bg-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-primary-foreground font-bold">{step.step}</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground mb-4">{step.description}</p>
                  <ul className="space-y-2 text-sm">
                    {step.features.map((feature, featureIndex) => (
                      <motion.li
                        key={featureIndex}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + index * 0.2 + featureIndex * 0.1 }}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-16 text-center"
          >
            <Button size="lg" className="h-12 px-8 group relative overflow-hidden" asChild>
              <Link href={user ? "/dashboard" : "/signup"}>
                <span className="relative z-10 flex items-center">
                  {user ? "Go to Dashboard" : "Try it yourself"}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 bg-white/20 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section ref={testimonialsRef} id="testimonials" className="py-24 relative">
        <div className="absolute inset-0 bg-grid-small-black/[0.03] dark:bg-grid-small-white/[0.03] -z-10" />

        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16 max-w-3xl mx-auto"
          >
            <Badge className="mb-4" variant="outline">
              <span className="inline-flex items-center">
                <Star className="h-3.5 w-3.5 mr-1 text-primary" />
                <span>Testimonials</span>
              </span>
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
              Trusted by businesses worldwide
            </h2>
            <p className="text-lg text-muted-foreground">See what our customers have to say about Ingestio.io</p>
          </motion.div>

          <Carousel className="w-full max-w-5xl mx-auto">
            <CarouselContent>
              {[
                {
                  name: "Sarah Johnson",
                  role: "Operations Manager, TechCorp",
                  quote:
                    "Ingestio.io has transformed our document processing workflow. What used to take hours now takes minutes, with better accuracy. The ROI was immediate and the customer support has been exceptional.",
                  avatar: "/landing/avatar1.jpg",
                },
                {
                  name: "Michael Chen",
                  role: "CFO, Global Logistics",
                  quote:
                    "The ROI was immediate. We've reduced our invoice processing costs by 75% and eliminated data entry errors completely. I can't imagine going back to our old manual processes.",
                  avatar: "/landing/avatar2.jpg",
                },
                {
                  name: "Emily Rodriguez",
                  role: "IT Director, Healthcare Solutions",
                  quote:
                    "The API integration was seamless. We connected Ingestio.io to our existing systems in less than a day. The documentation is excellent and the developer experience is top-notch.",
                  avatar: "/landing/avatar3.jpg",
                },
                {
                  name: "David Kim",
                  role: "CEO, Retail Innovations",
                  quote:
                    "Implementing Ingestio.io was one of the best business decisions we made last year. The accuracy of the data extraction is impressive, and it has freed up our team to focus on more strategic initiatives.",
                  avatar: "/landing/avatar4.jpg",
                },
              ].map((testimonial, index) => (
                <CarouselItem key={index} className="md:basis-1/1 lg:basis-1/2 pl-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="overflow-hidden h-full">
                      <CardContent className="p-6">
                        <div className="flex flex-col h-full">
                          <div className="mb-4 flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                            ))}
                          </div>
                          <blockquote className="flex-1 mb-4 text-lg italic">"{testimonial.quote}"</blockquote>
                          <div className="flex items-center gap-4">
                            <Avatar className="border-2 border-transparent hover:border-primary transition-colors">
                              <AvatarImage src={testimonial.avatar} alt={testimonial.name} className="object-cover hover:scale-110 transition-transform duration-300" />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {testimonial.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{testimonial.name}</div>
                              <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center mt-8 gap-2">
              <CarouselPrevious className="relative static transform-none" />
              <CarouselNext className="relative static transform-none" />
            </div>
          </Carousel>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-16 flex justify-center"
          >
            <Link
              href="#"
              className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Read more customer stories
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={pricingRef} id="pricing" className="py-24 bg-muted/30 dark:bg-muted/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 -z-10 h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-3xl" />

        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16 max-w-3xl mx-auto"
          >
            <Badge className="mb-4" variant="outline">
              <span className="inline-flex items-center">
                <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
                <span>Pricing</span>
              </span>
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-muted-foreground">Choose the plan that's right for your business</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Free",
                description: "Perfect for getting started",
                price: "£0",
                period: "/month",
                note: "No credit card required",
                features: [
                  { included: true, text: "10 pages per month" },
                  { included: true, text: "Basic extraction features" },
                  { included: true, text: "Export to JSON, Excel, CSV" },
                  { included: false, text: "Priority support" },
                ],
                buttonText: "Start For Free",
                buttonVariant: "outline" as const,
                popular: false,
                planId: "starter",
              },
              {
                title: "Basic",
                description: "For individual professionals",
                price: "£9.99",
                period: "/month",
                note: "Billed monthly",
                features: [
                  { included: true, text: "100 pages per month" },
                  { included: true, text: "Advanced extraction features" },
                  { included: true, text: "Export to JSON, Excel, CSV" },
                  { included: false, text: "Priority support" },
                ],
                buttonText: "Upgrade Now",
                buttonVariant: "outline" as const,
                popular: false,
                planId: "plus",
              },
              {
                title: "Pro",
                description: "For teams and businesses",
                price: "£19.99",
                period: "/month",
                note: "Perfect for growing businesses",
                features: [
                  { included: true, text: "500 pages per month" },
                  { included: true, text: "Advanced extraction features" },
                  { included: true, text: "Export to JSON, Excel, CSV" },
                  { included: true, text: "Priority customer support" },
                ],
                buttonText: "Go Pro",
                buttonVariant: "default" as const,
                popular: true,
                planId: "growth",
              },
            ].map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  className={`border ${plan.popular ? "border-2 border-primary" : ""} relative bg-background h-full`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </div>
                  )}
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold">{plan.title}</h3>
                      <p className="text-muted-foreground">{plan.description}</p>
                    </div>
                    <div className="mb-6">
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold">{plan.price}</span>
                        <span className="text-muted-foreground ml-1">{plan.period}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{plan.note}</p>
                    </div>
                    <ul className="space-y-3 mb-6 flex-grow">
                      {plan.features.map((feature, featureIndex) => (
                        <motion.li
                          key={featureIndex}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + index * 0.1 + featureIndex * 0.05 }}
                          className="flex items-center gap-2"
                        >
                          {feature.included ? (
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                          ) : (
                            <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className={feature.included ? "" : "text-muted-foreground"}>{feature.text}</span>
                        </motion.li>
                      ))}
                    </ul>
                    <Button 
                      className="w-full mt-auto" 
                      variant={plan.buttonVariant}
                      onClick={plan.planId === "starter" 
                        ? () => window.location.href = "/signup" 
                        : () => handlePlanSelect(plan.planId)}
                      disabled={isCheckoutLoading !== null}
                    >
                      {isCheckoutLoading === plan.planId ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        plan.buttonText
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 p-8 border rounded-xl bg-background"
          >
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-2">Need a custom solution?</h3>
                <p className="text-muted-foreground mb-4">
                  Have higher volume needs or require custom features? Contact our team to discuss a tailored solution for your business.
                </p>
                <Button asChild className="group relative overflow-hidden">
                  <Link href="/contact">
                    <span className="relative z-10 flex items-center">
                      Contact our team
                      <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                    <span className="absolute inset-0 bg-white/20 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-4">
                {[
                  "High-volume document processing",
                  "Dedicated customer success manager",
                  "Custom extraction models for your documents",
                  "Training and onboarding assistance",
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 relative">
        <div className="container px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16 max-w-3xl mx-auto"
          >
            <Badge className="mb-4" variant="outline">
              <span className="inline-flex items-center">
                <span>FAQ</span>
              </span>
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
              Frequently asked questions
            </h2>
            <p className="text-lg text-muted-foreground">Everything you need to know about Ingestio.io</p>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <ScrollArea className="h-[500px] pr-4">
              {[
                {
                  question: "How accurate is the data extraction?",
                  answer:
                    "Our AI-powered extraction achieves 99% accuracy for most document types. The system continuously learns and improves with each document processed. For critical data points, we provide confidence scores and validation tools to ensure maximum accuracy.",
                },
                {
                  question: "What document types are supported?",
                  answer:
                    "Ingestio.io supports a wide range of document types including invoices, receipts, contracts, forms, ID cards, passports, bank statements, and more. Our system can handle PDFs, images (JPG, PNG), scanned documents, and even handwritten notes with high accuracy.",
                },
                {
                  question: "How secure is my data?",
                  answer:
                    "Security is our top priority. All data is encrypted both in transit and at rest using industry-standard encryption. We are SOC 2 Type II compliant and GDPR compliant. Your documents are processed in isolated environments and can be automatically deleted after processing if required.",
                },
                {
                  question: "Can I integrate with my existing systems?",
                  answer:
                    "Yes, Ingestio.io offers robust integration options. We provide a RESTful API, webhooks, and pre-built connectors for popular platforms like Salesforce, QuickBooks, SAP, and more. Our developer documentation makes custom integrations straightforward.",
                },
                {
                  question: "What is the pricing model?",
                  answer:
                    "Our pricing is based on the number of pages processed per month. We offer a Free tier with 10 pages per month at no cost, a Basic tier at £9.99/month for up to 100 pages, and a Pro tier at £19.99/month for up to 500 pages with priority support. All plans include JSON, Excel, and CSV export formats.",
                },
                {
                  question: "How long does implementation take?",
                  answer:
                    "Most customers are up and running within minutes. Our intuitive interface requires minimal setup for standard document types. For custom templates or complex integrations, our team provides support to ensure a smooth implementation process, typically completed within days.",
                },
                {
                  question: "Is there a trial period?",
                  answer:
                    "We offer a Free tier that you can use indefinitely, with 10 pages per month at no cost. This allows you to try our platform with your documents before deciding to upgrade to our Basic or Pro plan for more pages and additional features.",
                },
                {
                  question: "What kind of support do you offer?",
                  answer:
                    "All plans include email support with 24-hour response times. Pro plans include priority support with faster response times and dedicated assistance for more complex issues.",
                },
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="mb-6"
                >
                  <div className="border-b pb-4 mb-4">
                    <h3 className="text-lg font-medium mb-2">{faq.question}</h3>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </div>
                </motion.div>
              ))}
            </ScrollArea>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 -z-10" />
        <div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="container px-4 md:px-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto text-center"
          >
            <Badge className="mb-4" variant="outline">
              <span className="inline-flex items-center">
                <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
                <span>Get Started Today</span>
              </span>
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
              Ready to transform your document workflow?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of businesses that trust Ingestio.io for their document processing needs.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="h-12 px-8 group relative overflow-hidden" asChild>
                <Link href={user ? "/dashboard" : "/signup"}>
                  <span className="relative z-10 flex items-center">
                    {user ? "Go to Dashboard" : "Get Started Now"}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="absolute inset-0 bg-white/20 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 group" asChild>
                <Link href="/contact">
                  <span className="flex items-center">
                    Talk to sales
                    <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Choose a plan that fits your needs</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-muted/30 dark:bg-muted/10">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary p-1.5 rounded-lg">
                  <FileText className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl">
                  Ingestio<span className="text-primary">.io</span>
                </span>
              </div>
              <p className="text-muted-foreground mb-4 max-w-xs">
                AI-powered document processing that saves time, reduces errors, and streamlines your workflow.
              </p>
              <div className="flex gap-4">
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect width="4" height="12" x="2" y="9"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </Link>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    API
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Ingestio.io. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

