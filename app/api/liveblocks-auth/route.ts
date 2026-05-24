import type { User } from "@clerk/backend"
import { auth, currentUser } from "@clerk/nextjs/server"

import { getLiveblocksClient, getLiveblocksUserColor } from "@/lib/liveblocks"
import {
  badRequestResponse,
  forbiddenResponse,
  parseJsonBody,
  unauthorizedResponse,
} from "@/lib/project-api"
import { getProjectAccessForIdentity } from "@/lib/project-access"

interface LiveblocksAuthRequest {
  roomId: string
}

function getPrimaryEmail(user: User | null) {
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses.at(0)?.emailAddress

  return primaryEmail?.toLowerCase() ?? null
}

function getDisplayName(user: User | null) {
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")

  if (fullName.length > 0) {
    return fullName
  }

  return (
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    "Collaborator"
  )
}

function getAvatarInfo(user: User | null) {
  if (typeof user?.imageUrl !== "string" || user.imageUrl.length === 0) {
    return {}
  }

  return { avatar: user.imageUrl }
}

async function getLiveblocksAuthRequest(
  request: Request
): Promise<
  | {
      data: LiveblocksAuthRequest
      response?: never
    }
  | {
      data?: never
      response: Response
    }
> {
  const bodyResult = await parseJsonBody(request)

  if (bodyResult.response !== undefined) {
    return { response: bodyResult.response }
  }

  const roomId = bodyResult.body.room

  if (typeof roomId !== "string" || roomId.trim().length === 0) {
    return { response: badRequestResponse("Liveblocks room ID is required.") }
  }

  return {
    data: {
      roomId: roomId.trim(),
    },
  }
}

export async function POST(request: Request) {
  const { isAuthenticated, userId } = await auth()

  if (!isAuthenticated || userId === null) {
    return unauthorizedResponse()
  }

  const authRequest = await getLiveblocksAuthRequest(request)

  if (authRequest.response !== undefined) {
    return authRequest.response
  }

  const user = await currentUser()
  const access = await getProjectAccessForIdentity(authRequest.data.roomId, {
    userId,
    primaryEmail: getPrimaryEmail(user),
  })

  if (access === null) {
    return forbiddenResponse()
  }

  const liveblocks = getLiveblocksClient()
  await liveblocks.getOrCreateRoom(access.project.id, {
    defaultAccesses: [],
    metadata: {
      projectId: access.project.id,
    },
  })

  const session = liveblocks.prepareSession(userId, {
    userInfo: {
      name: getDisplayName(user),
      ...getAvatarInfo(user),
      color: getLiveblocksUserColor(userId),
    },
  })

  session.allow(access.project.id, session.FULL_ACCESS)

  const { body, status } = await session.authorize()

  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  })
}
