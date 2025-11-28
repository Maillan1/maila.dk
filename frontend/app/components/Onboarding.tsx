'use client'

/**
 * This file is used for onboarding when you don't have content yet and are using the template for the first time.
 * Once you have provided a url for the environment variable NEXT_PUBLIC_SANITY_STUDIO_URL, and have content, you can delete this file.
 */

import Link from 'next/link'
import {useIsPresentationTool} from 'next-sanity/hooks'
import {createDataAttribute} from 'next-sanity'
import {uuid} from '@sanity/uuid'

import {studioUrl} from '@/sanity/lib/api'

type OnboardingMessageProps = {
  message: {
    title: string
    description: string
  }
  link: {
    title: string
    href: string
    showIcon?: boolean
  }
  type?: string
  path?: string
}

const OnboardingMessage = ({message, link, type, path}: OnboardingMessageProps) => {
  const isPresentation = useIsPresentationTool()

  return (
    <>
      <div>
        <h3 className="text-2xl font-semibold text-purple-900">{message.title}</h3>
        <p className="mt-1 text-sm text-warm-700">{message.description}</p>
      </div>

      <div>
        {!isPresentation ? (
          <Link
            className="inline-flex rounded-full gap-2 items-center bg-purple-600 text-white hover:bg-purple-700 focus:bg-purple-700 py-3 px-6 transition-colors duration-200"
            href={link.href}
            target="_blank"
          >
            {link.title}
            {(link.showIcon ?? true) && (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
            )}
          </Link>
        ) : (
          <button
            className="cursor-pointer inline-flex rounded-full gap-2 items-center bg-purple-600 text-white hover:bg-purple-700 focus:bg-purple-700 py-3 px-6 transition-colors duration-200"
            data-sanity={createDataAttribute({
              id: uuid(),
              type,
              path,
            }).toString()}
          >
            {link.title}
            {(link.showIcon ?? true) && (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </>
  )
}

export default function Onboarding() {
  return (
    <div className="max-w-2xl mx-auto grid grid-flow-row gap-6 py-12 text-center bg-purple-50 border-2 border-purple-200 rounded-lg p-8">
      <svg
        className="mx-auto h-16 w-16 text-purple-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
      <OnboardingMessage
        message={{
          title: 'No posts yet',
          description: 'Get started by creating a new post.',
        }}
        link={{
          title: 'Create Post',
          href: `${studioUrl}/structure/intent/create/template=post;type=post;path=title`,
        }}
        type="post"
        path="title"
      />
    </div>
  )
}

export function PageOnboarding() {
  return (
    <div className="max-w-2xl mx-auto grid grid-flow-row gap-6 py-12 text-center bg-purple-50 border-2 border-purple-200 rounded-lg p-8">
      <svg
        className="mx-auto h-16 w-16 text-purple-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
      <OnboardingMessage
        message={{
          title: 'About Page (/about) does not exist yet',
          description: 'Get started by creating an about page.',
        }}
        link={{
          title: 'Create Page',
          href: `${studioUrl}/structure/intent/create/template=page;type=page;path=name`,
        }}
        type="page"
        path="name"
      />
    </div>
  )
}
