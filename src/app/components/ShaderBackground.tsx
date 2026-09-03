'use client'

import { useEffect, useRef } from 'react'
import { cn } from '../../../lib/utils'

const SHADER_VERTEX_SOURCE = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

/**
 * Renders an animated, mouse-reactive WebGL noise background from a given
 * GLSL fragment shader source. Contained within its positioned ancestor
 * (`absolute inset-0`) by default rather than fixed to the viewport, so it
 * stays inside this app's mobile-card frame instead of bleeding past it on
 * desktop — pass `className` to override.
 */
export default function ShaderBackground({ fragmentSource, className }: { fragmentSource: string; className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const syncSize = () => {
            const width = canvas.clientWidth || 1280
            const height = canvas.clientHeight || 720
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width
                canvas.height = height
            }
        }

        let resizeObserver: ResizeObserver | null = null
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(syncSize)
            resizeObserver.observe(canvas)
        }
        syncSize()

        const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null
        if (!gl) return

        const compileShader = (type: number, source: string) => {
            const shader = gl.createShader(type)
            if (!shader) return null
            gl.shaderSource(shader, source)
            gl.compileShader(shader)
            return shader
        }

        const program = gl.createProgram()
        const vertexShader = compileShader(gl.VERTEX_SHADER, SHADER_VERTEX_SOURCE)
        const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource)
        if (!program || !vertexShader || !fragmentShader) return

        gl.attachShader(program, vertexShader)
        gl.attachShader(program, fragmentShader)
        gl.linkProgram(program)
        gl.useProgram(program)

        const buffer = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
        const positionLocation = gl.getAttribLocation(program, 'a_position')
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

        const uTime = gl.getUniformLocation(program, 'u_time')
        const uResolution = gl.getUniformLocation(program, 'u_resolution')
        const uMouse = gl.getUniformLocation(program, 'u_mouse')

        const mouse = { x: canvas.width / 2, y: canvas.height / 2 }
        const handleMouseMove = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            if (rect.width && rect.height) {
                const nx = (event.clientX - rect.left) / rect.width
                const ny = 1.0 - (event.clientY - rect.top) / rect.height
                mouse.x = nx * canvas.width
                mouse.y = ny * canvas.height
            }
        }
        window.addEventListener('mousemove', handleMouseMove)

        let frameId = 0
        const render = (t: number) => {
            if (!resizeObserver) syncSize()
            gl.viewport(0, 0, canvas.width, canvas.height)
            if (uTime) gl.uniform1f(uTime, t * 0.001)
            if (uResolution) gl.uniform2f(uResolution, canvas.width, canvas.height)
            if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y)
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
            frameId = requestAnimationFrame(render)
        }
        frameId = requestAnimationFrame(render)

        return () => {
            // Deliberately NOT calling WEBGL_lose_context here — React 18
            // Strict Mode double-invokes this effect in dev (mount → cleanup
            // → mount again), and losing the context makes it permanently
            // dead: the second mount's canvas.getContext('webgl') hands back
            // that same dead context, and every draw call silently no-ops,
            // so the shader never renders. Canceling the frame loop and
            // detaching listeners is enough — the context itself is
            // reclaimed once the canvas is actually removed from the DOM.
            cancelAnimationFrame(frameId)
            window.removeEventListener('mousemove', handleMouseMove)
            resizeObserver?.disconnect()
        }
    }, [fragmentSource])

    return (
        <div className={className ?? "absolute inset-0 h-full w-full z-0 pointer-events-none"}>
            <canvas ref={canvasRef} className={cn("block w-full h-full")} />
        </div>
    )
}
