'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Gamepad2Icon, GamepadIcon } from 'lucide-react'

type GameCharacter = {
    y: number
    velocity: number
    isJumping: boolean
}

type Obstacle = {
    x: number
    width: number
    height: number
}

const GRAVITY = 0.6
const JUMP_FORCE = -12
const GAME_HEIGHT = 150
const GROUND_HEIGHT = 20
const CHARACTER_SIZE = 30
const OBSTACLE_WIDTH = 20
const INITIAL_OBSTACLE_SPEED = 5
const MAX_OBSTACLE_SPEED = 12

export default function DinoGame() {
    const [isPlaying, setIsPlaying] = useState(false)
    const [gameOver, setGameOver] = useState(false)
    const [score, setScore] = useState(0)
    const [highScore, setHighScore] = useState(0)
    const [showGame, setShowGame] = useState(false)
    const [obstacleSpeed, setObstacleSpeed] = useState(INITIAL_OBSTACLE_SPEED)

    const characterRef = useRef<GameCharacter>({
        y: GAME_HEIGHT - GROUND_HEIGHT - CHARACTER_SIZE,
        velocity: 0,
        isJumping: false
    })

    const obstacleRef = useRef<Obstacle>({
        x: 400,
        width: OBSTACLE_WIDTH,
        height: 40
    })

    const gameLoopRef = useRef<number>()
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Load high score from localStorage
    useEffect(() => {
        const savedHighScore = localStorage.getItem('dinoGameHighScore')
        if (savedHighScore) {
            setHighScore(parseInt(savedHighScore))
        }
    }, [])

    const jump = useCallback(() => {
        if (!characterRef.current.isJumping) {
            characterRef.current.velocity = JUMP_FORCE
            characterRef.current.isJumping = true
        }
    }, [])

    const handleKeyPress = useCallback((e: KeyboardEvent) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault()
            if (!isPlaying && !gameOver) {
                startGame()
            } else {
                jump()
            }
        }
    }, [jump, isPlaying, gameOver])

    const resetGame = useCallback(() => {
        characterRef.current = {
            y: GAME_HEIGHT - GROUND_HEIGHT - CHARACTER_SIZE,
            velocity: 0,
            isJumping: false
        }
        obstacleRef.current = {
            x: 400,
            width: OBSTACLE_WIDTH,
            height: 40
        }
        setObstacleSpeed(INITIAL_OBSTACLE_SPEED)
        setScore(0)
        setGameOver(false)
    }, [])

    const startGame = useCallback(() => {
        setIsPlaying(true)
        resetGame()
    }, [resetGame])

    // Calculate speed based on score
    const calculateSpeed = useCallback((currentScore: number) => {
        return Math.min(
            INITIAL_OBSTACLE_SPEED + Math.floor(currentScore / 5),
            MAX_OBSTACLE_SPEED
        )
    }, [])

    const updateGame = useCallback(() => {
        const ctx = canvasRef.current?.getContext('2d')
        if (!ctx || gameOver) return

        // Clear canvas
        ctx.clearRect(0, 0, 400, GAME_HEIGHT)

        // Update character
        const character = characterRef.current
        character.velocity += GRAVITY
        character.y += character.velocity

        // Ground collision
        if (character.y > GAME_HEIGHT - GROUND_HEIGHT - CHARACTER_SIZE) {
            character.y = GAME_HEIGHT - GROUND_HEIGHT - CHARACTER_SIZE
            character.velocity = 0
            character.isJumping = false
        }

        // Update obstacle
        const obstacle = obstacleRef.current
        obstacle.x -= obstacleSpeed
        if (obstacle.x < -OBSTACLE_WIDTH) {
            obstacle.x = 400
            setScore(prev => {
                const newScore = prev + 1
                setObstacleSpeed(calculateSpeed(newScore))
                return newScore
            })
        }

        // Collision detection
        if (
            character.y + CHARACTER_SIZE > GAME_HEIGHT - GROUND_HEIGHT - obstacle.height &&
            obstacle.x < CHARACTER_SIZE &&
            obstacle.x + obstacle.width > 0
        ) {
            setGameOver(true)
            setIsPlaying(false)
            if (score > highScore) {
                setHighScore(score)
                localStorage.setItem('dinoGameHighScore', score.toString())
            }
        }

        // Draw game
        // Ground
        ctx.fillStyle = '#000'
        ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, 400, GROUND_HEIGHT)

        // Character
        ctx.fillStyle = '#4A5568'
        ctx.fillRect(0, character.y, CHARACTER_SIZE, CHARACTER_SIZE)

        // Obstacle
        const gradient = ctx.createLinearGradient(
            obstacle.x,
            0,
            obstacle.x + obstacle.width,
            0
        )
        gradient.addColorStop(0, '#E53E3E')
        gradient.addColorStop(1, '#C53030')
        ctx.fillStyle = gradient
        ctx.fillRect(
            obstacle.x,
            GAME_HEIGHT - GROUND_HEIGHT - obstacle.height,
            obstacle.width,
            obstacle.height
        )

        // Score
        ctx.fillStyle = '#2D3748'
        ctx.font = 'bold 20px Arial'
        ctx.fillText(`Score: ${score}`, 10, 30)

        // Speed indicator
        ctx.font = '14px Arial'
        ctx.fillText(`Speed: ${obstacleSpeed.toFixed(1)}x`, 10, 50)

        gameLoopRef.current = requestAnimationFrame(updateGame)
    }, [gameOver, score, highScore, obstacleSpeed, calculateSpeed])

    useEffect(() => {
        if (isPlaying) {
            window.addEventListener('keydown', handleKeyPress)
            gameLoopRef.current = requestAnimationFrame(updateGame)
        }

        return () => {
            window.removeEventListener('keydown', handleKeyPress)
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current)
            }
        }
    }, [isPlaying, handleKeyPress, updateGame])

    return (
        <>
            <button
                onClick={() => setShowGame(!showGame)}

            >
                <GamepadIcon className="w-5 h-5" />
                {/* {showGame ? 'Hide Game' : 'Play Game'} */}
            </button>

            {showGame && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black opacity-50" style={{ position: "inherit" }} onClick={() => setShowGame(false)}></div>
                    <div className="relative bg-white p-6 rounded-lg shadow-xl max-w-[500px] w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Dino Jump</h3>
                            <div className="flex items-center space-x-4">
                                <p className="text-sm font-medium">High Score: {highScore}</p>
                                <button
                                    onClick={() => setShowGame(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <canvas
                                ref={canvasRef}
                                width={400}
                                height={GAME_HEIGHT}
                                className="w-full border border-gray-300 rounded bg-gray-50"
                                onClick={isPlaying ? jump : startGame}
                            />
                            {!isPlaying && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-30">
                                    <button
                                        onClick={startGame}
                                        className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-green-600 transition-colors mb-4"
                                    >
                                        {gameOver ? 'Try Again' : 'Start Game'}
                                    </button>
                                    <p className="text-white text-sm">
                                        Press Space/Up Arrow or Click to jump
                                    </p>
                                    {gameOver && (
                                        <p className="text-white font-bold mt-2">
                                            Final Score: {score}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="mt-4 text-sm text-gray-600">
                            <p>Speed increases every 5 points!</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}