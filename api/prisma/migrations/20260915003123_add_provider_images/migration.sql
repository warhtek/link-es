-- AlterTable
ALTER TABLE "provider_profiles" ADD COLUMN     "avatarUrl" VARCHAR(1000),
ADD COLUMN     "galleryImages" TEXT[] DEFAULT ARRAY[]::TEXT[];
